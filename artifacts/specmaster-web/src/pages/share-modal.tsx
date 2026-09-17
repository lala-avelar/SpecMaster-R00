import { useEffect, useState } from 'react';
import { Check, Copy, Link as LinkIcon, Trash2, UserPlus, X } from 'lucide-react';
import { createInvitation, fetchInvitations, fetchProjectMembers, removeMember, revokeInvitation, updateMemberRole, type Invitation, type MemberInfo, type Role } from '@/data';

const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador' };

function inviteLink(token: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/join/${token}`;
}

export default function ShareModal({ projectId, projectName, currentUserId, canManage, onClose }: { projectId: string; projectName: string; currentUserId: string; canManage: boolean; onClose: () => void }) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [expires, setExpires] = useState<'never' | '7' | '30'>('never');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [memberList, inviteList] = await Promise.all([fetchProjectMembers(projectId), fetchInvitations(projectId)]);
      setMembers(memberList);
      setInvitations(inviteList);
      setError('');
    } catch {
      setError('Não foi possível carregar os membros.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const generateLink = async () => {
    setBusy(true);
    try {
      const targetEmail = email.trim();
      const targetRole: Role = targetEmail ? role : 'viewer';
      const expiresAt = expires === 'never' ? null : new Date(Date.now() + Number(expires) * 86400000).toISOString();
      const token = await createInvitation({ projectId, email: targetEmail, role: targetRole, expiresAt, createdBy: currentUserId });
      const generated = inviteLink(token);
      setLink(generated);
      await load();
      try {
        await navigator.clipboard?.writeText(generated);
        flash('Link criado e copiado.');
      } catch {
        flash('Link criado.');
      }
    } catch {
      setError('Não foi possível gerar o link.');
    }
    setBusy(false);
  };

  const revoke = async (id: string) => {
    setInvitations((current) => current.filter((invitation) => invitation.id !== id));
    try {
      await revokeInvitation(id);
    } catch {
      setError('Não foi possível revogar o link.');
      load();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(link);
      flash('Link copiado.');
    } catch {
      flash('Copie o link manualmente.');
    }
  };

  const changeRole = async (userId: string, nextRole: Role) => {
    setMembers((current) => current.map((member) => (member.userId === userId ? { ...member, role: nextRole } : member)));
    try {
      await updateMemberRole(projectId, userId, nextRole);
    } catch {
      setError('Não foi possível alterar o papel.');
      load();
    }
  };

  const drop = async (userId: string) => {
    if (userId === currentUserId) return;
    setMembers((current) => current.filter((member) => member.userId !== userId));
    try {
      await removeMember(projectId, userId);
    } catch {
      setError('Não foi possível remover o membro.');
      load();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="import-modal share-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 560px)' }}>
        <div className="modal-top">
          <div>
            <p className="section-kicker">COMPARTILHAR PROJETO</p>
            <h2 id="share-title">{projectName}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
        </div>

        {canManage ? (
          <div className="share-invite">
            <p className="filter-menu-label">CONVIDAR</p>
            <div className="share-invite-row">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="e-mail (opcional)" />
              <select value={email.trim() ? role : 'viewer'} onChange={(event) => setRole(event.target.value as Role)} disabled={!email.trim()} title={!email.trim() ? 'Link aberto entra como Visualizador' : undefined}>
                <option value="viewer">Visualizador</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
              <select value={expires} onChange={(event) => setExpires(event.target.value as 'never' | '7' | '30')}>
                <option value="never">Sem prazo</option>
                <option value="7">Expira em 7 dias</option>
                <option value="30">Expira em 30 dias</option>
              </select>
              <button type="button" className="button button-primary" onClick={generateLink} disabled={busy}><UserPlus size={15} /> Gerar link</button>
            </div>
            <p className="share-hint">{email.trim() ? 'Convite por e-mail: só aquele e-mail consegue aceitar, com o papel escolhido.' : 'Sem e-mail = link aberto: qualquer pessoa com o link entra como Visualizador.'}</p>
            {link && (
              <div className="share-link">
                <LinkIcon size={14} />
                <input readOnly value={link} onFocus={(event) => event.target.select()} />
                <button type="button" className="button button-quiet button-small" onClick={copy}><Copy size={13} /> Copiar</button>
              </div>
            )}
            <p className="share-hint">Quem abrir o link cria a conta, informa nome/cargo/empresa e entra no projeto com esse papel.</p>
            {invitations.length > 0 && (
              <>
                <p className="filter-menu-label">LINKS ATIVOS</p>
                <div className="share-members">
                  {invitations.map((invitation) => {
                    const expired = invitation.expiresAt ? new Date(invitation.expiresAt) < new Date() : false;
                    const used = Boolean(invitation.acceptedAt);
                    const active = !expired && !used;
                    return (
                      <div className="share-member" key={invitation.id}>
                        <LinkIcon size={14} />
                        <div className="share-member-id">
                          <strong>{invitation.email || 'Qualquer pessoa com o link'}</strong>
                          <small>{ROLE_LABEL[invitation.role]}{invitation.expiresAt ? ` · ${expired ? 'expirado' : `expira ${new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}`}` : ' · sem prazo'}{used ? ' · usado' : ''}</small>
                        </div>
                        {active && <button type="button" className="button button-quiet button-small" onClick={() => { navigator.clipboard?.writeText(inviteLink(invitation.token)).then(() => flash('Link copiado.')).catch(() => {}); }}><Copy size={13} /> Copiar</button>}
                        <button type="button" className="icon-button delete-row" aria-label="Revogar link" onClick={() => revoke(invitation.id)}><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="share-hint">Somente administradores podem convidar ou gerenciar membros.</p>
        )}

        <p className="filter-menu-label">{members.length} MEMBRO(S)</p>
        <div className="share-members">
          {loading ? (
            <p className="share-hint">Carregando…</p>
          ) : members.length === 0 ? (
            <p className="share-hint">Nenhum membro ainda.</p>
          ) : (
            members.map((member) => (
              <div className="share-member" key={member.userId}>
                <span className="profile-avatar">{member.name ? member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : '?'}</span>
                <div className="share-member-id">
                  <strong>{member.name || 'Sem nome'}{member.userId === currentUserId ? ' (você)' : ''}</strong>
                  <small>{member.email || member.company || '—'}</small>
                </div>
                {canManage && member.userId !== currentUserId ? (
                  <>
                    <select value={member.role} onChange={(event) => changeRole(member.userId, event.target.value as Role)}>
                      <option value="viewer">Visualizador</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <button type="button" className="icon-button delete-row" aria-label={`Remover ${member.name}`} onClick={() => drop(member.userId)}><Trash2 size={14} /></button>
                  </>
                ) : (
                  <span className={`share-role ${member.role}`}>{ROLE_LABEL[member.role]}</span>
                )}
              </div>
            ))
          )}
        </div>

        {error && <div className="import-error">{error}</div>}
        {notice && <div className="share-notice"><Check size={13} /> {notice}</div>}

        <div className="modal-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

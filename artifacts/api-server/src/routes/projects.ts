import { Router, type IRouter } from "express";
import {
  CreateSpecificationBody,
  CreateSpecificationParams,
  DeleteSpecificationParams,
  GetProjectParams,
  UpdateSpecificationBody,
  UpdateSpecificationParams,
} from "@workspace/api-zod";

type Specification = {
  id: string;
  environment: string;
  item: string;
  dimension: string;
  finish: string;
  brand: string;
  budget: number;
  quotedPrice: number;
  updatedAt: string;
};

type Project = {
  id: string;
  name: string;
  client: string;
  location: string;
  completion: number;
  updatedAt: string;
  specifications: Specification[];
};

const now = () => new Date().toISOString();

const projects: Project[] = [
  {
    id: "ed-santa-monica",
    name: "Ed. Santa Mônica",
    client: "Construtora Horizonte",
    location: "São Paulo, SP",
    completion: 68,
    updatedAt: now(),
    specifications: [
      {
        id: "spec-1",
        environment: "Cozinha",
        item: "Porcelanato Polido",
        dimension: "90x90 cm",
        finish: "Polido",
        brand: "Portobello",
        budget: 120,
        quotedPrice: 105,
        updatedAt: now(),
      },
      {
        id: "spec-2",
        environment: "Banheiro",
        item: "Bacia com Caixa Acoplada",
        dimension: "-",
        finish: "Branco Brilho",
        brand: "Deca",
        budget: 650,
        quotedPrice: 780,
        updatedAt: now(),
      },
      {
        id: "spec-3",
        environment: "Área Comum",
        item: "Tinta Acrílica Premium",
        dimension: "18L",
        finish: "Fosco",
        brand: "Suvinil",
        budget: 450,
        quotedPrice: 420,
        updatedAt: now(),
      },
    ],
  },
  {
    id: "reserva-ipanema",
    name: "Residencial Reserva Ipanema",
    client: "Grupo Áurea",
    location: "Rio de Janeiro, RJ",
    completion: 41,
    updatedAt: now(),
    specifications: [],
  },
];

const publicProject = (project: Project) => ({
  id: project.id,
  name: project.name,
  client: project.client,
  location: project.location,
  completion: project.completion,
  updatedAt: project.updatedAt,
});

const findProject = (id: string) => projects.find((project) => project.id === id);

const router: IRouter = Router();

router.get("/projects", (_req, res) => {
  res.json(projects.map(publicProject));
});

router.get("/projects/:projectId", (req, res) => {
  const params = GetProjectParams.parse(req.params);
  const project = findProject(params.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ ...publicProject(project), specifications: project.specifications });
});

router.post("/projects/:projectId/specifications", (req, res) => {
  const params = CreateSpecificationParams.parse(req.params);
  const project = findProject(params.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const input = CreateSpecificationBody.parse(req.body);
  const specification: Specification = {
    ...input,
    id: `spec-${Date.now()}`,
    updatedAt: now(),
  };
  project.specifications.push(specification);
  project.updatedAt = specification.updatedAt;
  res.status(201).json(specification);
});

router.patch("/projects/:projectId/specifications/:specificationId", (req, res) => {
  const params = UpdateSpecificationParams.parse(req.params);
  const project = findProject(params.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const specification = project.specifications.find((item) => item.id === params.specificationId);
  if (!specification) {
    res.status(404).json({ error: "Specification not found" });
    return;
  }
  const input = UpdateSpecificationBody.parse(req.body);
  Object.assign(specification, input, { updatedAt: now() });
  project.updatedAt = specification.updatedAt;
  res.json(specification);
});

router.delete("/projects/:projectId/specifications/:specificationId", (req, res) => {
  const params = DeleteSpecificationParams.parse(req.params);
  const project = findProject(params.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const index = project.specifications.findIndex((item) => item.id === params.specificationId);
  if (index === -1) {
    res.status(404).json({ error: "Specification not found" });
    return;
  }
  project.specifications.splice(index, 1);
  project.updatedAt = now();
  res.status(204).send();
});

export default router;
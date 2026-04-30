import { SetMetadata } from "@nestjs/common";

export const DELETE_ENTITY_KEY = "DELETE_ENTITY_KEY";

export const DeleteEntity = (entity: string, idParam: string = "id") =>
    SetMetadata(DELETE_ENTITY_KEY, { entity, idParam });
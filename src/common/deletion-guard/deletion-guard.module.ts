import { Global, Module } from "@nestjs/common";
import { DeleteRelationGuardService } from "./delete-relation-guard.service";
import { DeleteRelationInterceptor } from "./delete-relation.interceptor";
@Global()
@Module({
    providers: [DeleteRelationGuardService, DeleteRelationInterceptor],
    exports: [DeleteRelationGuardService, DeleteRelationInterceptor],
})
export class DeletionGuardModule { }
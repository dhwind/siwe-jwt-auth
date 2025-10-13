import { Global, Module } from '@nestjs/common';
import { OrmService } from './orm.service';

@Global()
@Module({
  providers: [OrmService],
  exports: [OrmService],
})
export class OrmModule {}

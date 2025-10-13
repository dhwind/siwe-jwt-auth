import { Module } from '@nestjs/common';

import { MainModule } from './main/main.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [CommonModule, MainModule],
})
export class AppModule {}

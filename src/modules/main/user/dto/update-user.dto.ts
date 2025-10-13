import { IsString, MinLength } from 'class-validator';

export class UpdateUserDTO {
  @IsString()
  @MinLength(3)
  username: string;
}

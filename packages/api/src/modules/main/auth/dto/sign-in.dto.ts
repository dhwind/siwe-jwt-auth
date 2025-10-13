import { IsString } from 'class-validator';

export class SignInDTO {
  @IsString()
  nonce: string;

  @IsString()
  message: string;

  @IsString()
  signature: string;
}

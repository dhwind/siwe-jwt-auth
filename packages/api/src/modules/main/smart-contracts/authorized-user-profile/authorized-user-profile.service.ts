import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { UserService } from '@/modules/main/user/user.service';

@Injectable()
export class AuthorizedUserProfileService {
  private rpcProvider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService
  ) {
    this.rpcProvider = new ethers.JsonRpcProvider(
      this.configService.getOrThrow<string>(
        'contracts.authorizedUserProfile.rpcUrl'
      )
    );

    const privateKey = this.configService.getOrThrow<string>(
      'contracts.authorizedUserProfile.rpcPrivateKey'
    );
    this.wallet = new ethers.Wallet(privateKey, this.rpcProvider);

    const contractAddress = this.configService.getOrThrow<string>(
      'contracts.authorizedUserProfile.address'
    );

    this.contract = new ethers.Contract(
      contractAddress,
      this.configService.getOrThrow<ethers.InterfaceAbi>(
        'contracts.authorizedUserProfile.abi'
      ),
      this.wallet
    );

    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.contract.on(
      'UsernameUpdated',
      async (userAddress: string, newUsername: string, event: any) => {
        const eventLog = event.log as ethers.EventLog;

        try {
          const hasUserWithUsername = await this.userService.findUnique({
            username: newUsername,
          });

          if (hasUserWithUsername) {
            Logger.error(`Username "${newUsername}" is already taken`);
            return;
          }

          const user = await this.userService.findUnique({
            publicAddress: userAddress,
          });

          if (!user) {
            Logger.error(`User not found: ${userAddress}`);
            return;
          }

          await this.userService.update({
            where: {
              id: user.id,
            },
            data: {
              username: newUsername,
            },
          });

          Logger.log(
            `Transaction ${eventLog.transactionHash} (block ${eventLog.blockNumber}): Username updated for user "${userAddress}" from "${user.username}" to "${newUsername}"`
          );
        } catch (error) {
          Logger.error(`Error processing UsernameUpdated event: ${error}`);
        }
      }
    );
  }

  addJwtToContract(address: string, jwt: string) {
    return this.contract.setJwt(address, jwt);
  }

  updateUsername(address: string, jwt: string, username: string) {
    return this.contract.setUsername(address, jwt, username);
  }
}

import { ethers } from 'ethers';
import AuthorizedUserProfileAbi from './abi/AuthorizedUserProfile.json';

type AvailableSmartContracts = 'AuthorizedUserProfile';

type SmartContractConfig = {
  address: string;
  abi: ethers.InterfaceAbi;
  rpcUrl: string;
  rpcPrivateKey: string;
  websocketUrl: string;
};

const smartContracts: Record<AvailableSmartContracts, SmartContractConfig> = {
  AuthorizedUserProfile: {
    address: process.env.CONTRACT_AUTHORIZED_USER_PROFILE_ADDRESS ?? '',
    abi: AuthorizedUserProfileAbi,
    websocketUrl:
      process.env.CONTRACT_AUTHORIZED_USER_PROFILE_WEBSOCKET_URL ?? '',
    rpcUrl: process.env.CONTRACT_AUTHORIZED_USER_PROFILE_RPC_URL ?? '',
    rpcPrivateKey:
      process.env.CONTRACT_AUTHORIZED_USER_PROFILE_RPC_PRIVATE_KEY ?? '',
  },
};

export { smartContracts };

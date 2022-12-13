import 'dotenv/config';

import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

require('solidity-coverage');
require('hardhat-ignore-warnings');
// eslint-disable-next-line node/no-path-concat
dotenv.config({ path: __dirname + '/.env' });

const { GOERLI_API_KEY, GOERLI_DEPLOYER_PRIVATE_KEY } = process.env;
const config = {
  warnings: {
    'contracts/Mock_VRFCoordinator': {
      default: 'off',
    },
  },
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },

  networks: {
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_API_KEY}`,
      accounts: [GOERLI_DEPLOYER_PRIVATE_KEY!!]
    },
    polygon_mainnet: {
      url: process.env.POLYGON_URL || '',
      accounts:
        process.env.POLYGON_PRIVATE_KEY !== undefined
          ? [process.env.POLYGON_PRIVATE_KEY]
          : []
    }
  },
  gasReporter: {
    enabled: undefined,
    currency: 'THB',
    outputFile: 'gas-report.txt',
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'MATIC'
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.MUMBAI_POLYGONSCAN_API_KEY || '',
      rinkeby: process.env.ETHEREUM_ETHERSCAN_API_KEY || ''
    }
  }
};

export default config;

import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config({ path: ".env" });
const { GOERLI_DEPLOYER_PRIVATE_KEY, GEORLI_API_KEY } = process.env;

module.exports = {
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${GEORLI_API_KEY}`,
      accounts: [GOERLI_DEPLOYER_PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

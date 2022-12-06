import { expect } from 'chai';
import { ethers } from 'hardhat';
require('dotenv').config({ path: '.env' });

describe('Lottery', function () {
  let owner: any, A: any, B: any, C: any, D: any;
  let Token;
  let token: any;
  let Lottery;
  let lottery: any;
  let MockRandomNumberGenerator;
  let mockRandomNumberGenerator: any;

  beforeEach(async () => {
    [owner, A, B, C] = await ethers.getSigners();
    Token = await ethers.getContractFactory('MockToken');
    token = await Token.deploy();
    await token.deployed();

    // console.log(token.address);
    console.log(token.address);
    Lottery = await ethers.getContractFactory('Lottery');
    lottery = await Lottery.deploy(token.address, 2, 1, owner.address);

    await lottery.deployed();

    MockRandomNumberGenerator = await ethers.getContractFactory(
      'MockRandomNumberGenerator'
    );
    mockRandomNumberGenerator = await MockRandomNumberGenerator.deploy(
      5555,
      lottery.address
    );
    //   RandomNumberGenerator = await ethers.getContractFactory(
    //     "RandomNumberGenerator"
    //   );
  });

  it('Owner have token balance. others is not.', async function () {
    expect(await token.balanceOf(owner.address)).not.be.equal(0);

    expect(await token.balanceOf(A.address)).to.be.equal(0);
  });

  it('Random contract can get requestId', async function () {
    console.log(
      await mockRandomNumberGenerator.connect(owner).requestRandomNumber(1, 4)
    );
    expect(
      await mockRandomNumberGenerator.connect(owner).requestRandomNumber(1, 4)
    ).not.be.equal(0);

    expect(await token.balanceOf(A.address)).to.be.equal(0);
  });
});

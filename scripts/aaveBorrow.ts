/* eslint-disable no-process-exit */
// yarn hardhat node
// yarn hardhat run scripts/readPrice.ts --network localhost
import { ethers, getNamedAccounts } from "hardhat"
import { BigNumber } from "ethers"
import { IERC20, ILendingPool, ILendingPoolAddressesProvider } from "../typechain"
import { getWeth, WETH_ADDRESS, WETH_AMOUNT } from "./getWeth"
import { Address } from "hardhat-deploy/dist/types"
import { AggregatorV3Interface } from "../typechain/contracts"

async function aaveBorrow(): Promise<void> {
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const lendingPool = await getLendingPool(deployer)
  console.log(`LendingPool address ${lendingPool.address}`)
  // we need to approve lendingPool contract to take WETH from our wallet
  await approveErc20(WETH_ADDRESS, lendingPool.address, WETH_AMOUNT, deployer)
  // now we can deposit
  console.log("Depositing...")
  await lendingPool.deposit(WETH_ADDRESS, WETH_AMOUNT, deployer, 0)
  console.log("Deposited!")

  // Borrow Time!

  const { availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)
  const daiPrice = await getDaiPrice()
  const precentageToBorrow = 0.95
  const amountDaiToBorrow =
    (availableBorrowsETH.toString() as any) * precentageToBorrow * (1 / daiPrice.toNumber())
  const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
  console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
  const daiTokenADdress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  await borrowDai(daiTokenADdress, lendingPool, amountDaiToBorrowWei, deployer)
  // how much DAI can we borrow based on the value of ETH
  console.log("You've borrowed!")
  await getBorrowUserData(lendingPool, deployer)
  await repay(daiTokenADdress, lendingPool, amountDaiToBorrowWei, deployer)
  await getBorrowUserData(lendingPool, deployer)
}

async function borrowDai(
  daiAddress: Address,
  lendingPool: ILendingPool,
  amountDaiToBorrowWei: BigNumber,
  account: Address
) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
}

async function repay(
  daiAddress: Address,
  lendingPool: ILendingPool,
  amountDaiToBorrowWei: BigNumber,
  account: Address
) {
  await approveErc20(daiAddress, lendingPool.address, amountDaiToBorrowWei, account)
  const repayTx = await lendingPool.repay(daiAddress, amountDaiToBorrowWei, 1, account)
  await repayTx.wait(1)
  console.log("Repaid!")
}

async function getDaiPrice(): Promise<BigNumber> {
  const daiEthPrice: AggregatorV3Interface = await ethers.getContractAt(
    "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol:AggregatorV3Interface",
    "0x773616e4d11a78f511299002da57a0a94577f1f4"
  )
  const [_, price] = await daiEthPrice.latestRoundData()
  console.log(`The DAI/ETH price is ${price.toString()}`)
  return price
}

async function getBorrowUserData(lendingPool: ILendingPool, account: Address) {
  const [totalCollateralETH, totalDebtETH, availableBorrowsETH] =
    await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH.toString()} worth of ETH deposited.`)
  console.log(`You have ${totalDebtETH.toString()} worth of ETH borrowed.`)
  console.log(`You can borrow ${availableBorrowsETH.toString()} worth of ETH.`)

  return {
    totalCollateralETH,
    availableBorrowsETH,
    totalDebtETH,
  }
}

async function getLendingPool(account: Address): Promise<ILendingPool> {
  const lendingPoolAddressesProvider: ILendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  )
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
  const lendingPool: ILendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  )
  return lendingPool
}

async function approveErc20(
  erc20Address: Address,
  spenderAddress: Address,
  amountToSpend: BigNumber,
  account: Address
) {
  // we need to ERC20 WETH contract
  // call the approve method
  const erc20Weth: IERC20 = await ethers.getContractAt("IERC20", erc20Address, account)
  const tx = await erc20Weth.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("Approved!")
}

aaveBorrow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

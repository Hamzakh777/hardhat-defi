/* eslint-disable no-process-exit */
// yarn hardhat node
// yarn hardhat run scripts/readPrice.ts --network localhost
import { ethers, getNamedAccounts } from "hardhat"
import { BigNumber } from "ethers"
import { IERC20, ILendingPool, ILendingPoolAddressesProvider } from "../typechain"
import { getWeth, WETH_ADDRESS, WETH_AMOUNT } from "./getWeth"
import { Address } from "hardhat-deploy/dist/types"

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

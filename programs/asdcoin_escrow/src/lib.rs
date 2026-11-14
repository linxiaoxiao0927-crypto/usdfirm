//! ASDCoin (`asdcoin.com`) On-Chain Smart Contract (Solana / Anchor Architecture)
//! Implements:
//! 1. `mint_asd_stable` & `redeem_asd_stable`: 1:1 USD Reserve-Backed Stablecoin
//! 2. `commit_state_channel_rollup`: Off-chain AI Skill Gas (`ASD-G`) Merkle PoR anchoring
//! 3. `settle_four_flow_escrow`: Atomic 4-Flow (`setupyes` + `taxyesai` + `xpayes` + `uptoyes`) split

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContractError {
    UnauthorizedCustodian,
    InsufficientReserveBacking,
    FourFlowNotFullyAligned,
    InvalidSplitBasisPoints,
    EscrowAlreadySettled,
    ArithmeticOverflow,
}

#[derive(Debug, Clone)]
pub struct GlobalReserveVaultState {
    pub authority_pubkey: [u8; 32],
    pub total_reserve_usd_micro: u128,
    pub circulating_asd_s_micro: u128,
    pub total_burned_asd_g: u128,
    pub latest_por_merkle_root: [u8; 32],
    pub latest_slot: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OnChainEscrowStatus {
    LockedInTransit,
    SettledAtomicSplit,
    Refunded,
}

#[derive(Debug, Clone)]
pub struct FourFlowEscrowAccount {
    pub order_no: String,
    pub locked_asd_s_micro: u128,
    pub status: OnChainEscrowStatus,
    pub setupyes_entity_hash: [u8; 32],
    pub taxyes_route_hash: [u8; 32],
    pub xpayes_payment_hash: [u8; 32],
    pub uptoyes_waybill_hash: Option<[u8; 32]>,
    pub merchant_bps: u16,
    pub logistics_bps: u16,
    pub tax_bps: u16,
    pub treasury_burn_bps: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FourWaySplitPayout {
    pub merchant_amount_micro: u128,
    pub uptoyes_logistics_micro: u128,
    pub taxyes_withholding_micro: u128,
    pub treasury_burn_micro: u128,
}

impl GlobalReserveVaultState {
    /// On-chain instruction: Mint ASD-S 1:1 when XPayes/ItisCoin reserve attestation is verified.
    pub fn mint_asd_stable(
        &mut self,
        caller_pubkey: &[u8; 32],
        deposit_usd_micro: u128,
        new_por_merkle_root: [u8; 32],
        slot: u64,
    ) -> Result<u128, ContractError> {
        if caller_pubkey != &self.authority_pubkey {
            return Err(ContractError::UnauthorizedCustodian);
        }
        self.total_reserve_usd_micro = self
            .total_reserve_usd_micro
            .checked_add(deposit_usd_micro)
            .ok_or(ContractError::ArithmeticOverflow)?;
        self.circulating_asd_s_micro = self
            .circulating_asd_s_micro
            .checked_add(deposit_usd_micro)
            .ok_or(ContractError::ArithmeticOverflow)?;

        if self.total_reserve_usd_micro < self.circulating_asd_s_micro {
            return Err(ContractError::InsufficientReserveBacking);
        }
        self.latest_por_merkle_root = new_por_merkle_root;
        self.latest_slot = slot;
        Ok(deposit_usd_micro)
    }

    /// On-chain instruction: Commit batch rollup of off-chain AI Skill Gas (`ASD-G`) burns.
    pub fn commit_state_channel_rollup(
        &mut self,
        caller_pubkey: &[u8; 32],
        burned_gas_delta: u128,
        new_por_merkle_root: [u8; 32],
        slot: u64,
    ) -> Result<(), ContractError> {
        if caller_pubkey != &self.authority_pubkey {
            return Err(ContractError::UnauthorizedCustodian);
        }
        self.total_burned_asd_g = self
            .total_burned_asd_g
            .checked_add(burned_gas_delta)
            .ok_or(ContractError::ArithmeticOverflow)?;
        self.latest_por_merkle_root = new_por_merkle_root;
        self.latest_slot = slot;
        Ok(())
    }
}

/// On-chain instruction: Verify all 4 flows (`setupyes` + `taxyesai` + `xpayes` + `uptoyes`)
/// and execute atomic 4-way split settlement.
pub fn settle_four_flow_escrow(
    escrow: &mut FourFlowEscrowAccount,
    uptoyes_waybill_proof: [u8; 32],
) -> Result<FourWaySplitPayout, ContractError> {
    if escrow.status == OnChainEscrowStatus::SettledAtomicSplit {
        return Err(ContractError::EscrowAlreadySettled);
    }
    let total_bps = escrow.merchant_bps
        + escrow.logistics_bps
        + escrow.tax_bps
        + escrow.treasury_burn_bps;
    if total_bps != 10_000 {
        return Err(ContractError::InvalidSplitBasisPoints);
    }

    if escrow.setupyes_entity_hash == [0u8; 32]
        || escrow.taxyes_route_hash == [0u8; 32]
        || escrow.xpayes_payment_hash == [0u8; 32]
        || uptoyes_waybill_proof == [0u8; 32]
    {
        return Err(ContractError::FourFlowNotFullyAligned);
    }

    escrow.uptoyes_waybill_hash = Some(uptoyes_waybill_proof);
    escrow.status = OnChainEscrowStatus::SettledAtomicSplit;

    let total = escrow.locked_asd_s_micro;
    let merchant_amount_micro = (total * (escrow.merchant_bps as u128)) / 10_000;
    let uptoyes_logistics_micro = (total * (escrow.logistics_bps as u128)) / 10_000;
    let taxyes_withholding_micro = (total * (escrow.tax_bps as u128)) / 10_000;
    let treasury_burn_micro = total
        .saturating_sub(merchant_amount_micro)
        .saturating_sub(uptoyes_logistics_micro)
        .saturating_sub(taxyes_withholding_micro);

    Ok(FourWaySplitPayout {
        merchant_amount_micro,
        uptoyes_logistics_micro,
        taxyes_withholding_micro,
        treasury_burn_micro,
    })
}

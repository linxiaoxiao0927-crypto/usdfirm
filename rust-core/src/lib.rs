//! ASDCoin (`asdcoin.com`) Rust High-Frequency Clearing & State Channel Kernel
//! Implements u128 fixed-point arithmetic (Zero Floating-Point Drift)
//! and bridges off-chain AI Skill Gas micropayments to on-chain Rollup state roots.

pub mod merkle_por;

pub const GAS_PER_ASD_S: u128 = 1_000_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LedgerError {
    Overflow,
    InsufficientAsdStable,
    InsufficientAsdGas,
    InvalidSplitTotal,
    IdempotencyConflict,
    TrialBalanceBroken,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RustAccountState {
    pub account_id: String,
    pub owner_site: String,
    pub asd_stable_micro: u128, // 1 ASD-S = 1_000_000 micro units
    pub asd_gas_units: u128,    // 1 ASD-S = 1_000_000 ASD-G
    pub nonce: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SkillGasRollupReceipt {
    pub caller_site: String,
    pub skill_code: String,
    pub total_gas: u128,
    pub provider_gas: u128,
    pub burned_gas: u128,
    pub new_nonce: u64,
    pub state_root_hex: String,
}

impl RustAccountState {
    pub fn new(
        account_id: &str,
        owner_site: &str,
        asd_stable_micro: u128,
        asd_gas_units: u128,
    ) -> Self {
        Self {
            account_id: account_id.to_string(),
            owner_site: owner_site.to_string(),
            asd_stable_micro,
            asd_gas_units,
            nonce: 1,
        }
    }

    /// Atomic zero-slippage swap from ASD-S (micro) to ASD-G using checked u128 math.
    pub fn swap_stable_to_gas(
        &mut self,
        stable_micro_amount: u128,
    ) -> Result<u128, LedgerError> {
        if self.asd_stable_micro < stable_micro_amount {
            return Err(LedgerError::InsufficientAsdStable);
        }
        self.asd_stable_micro = self
            .asd_stable_micro
            .checked_sub(stable_micro_amount)
            .ok_or(LedgerError::Overflow)?;
        self.asd_gas_units = self
            .asd_gas_units
            .checked_add(stable_micro_amount)
            .ok_or(LedgerError::Overflow)?;
        self.nonce = self.nonce.saturating_add(1);
        Ok(stable_micro_amount)
    }
}

/// Executes a high-frequency off-chain AI Skill Gas burn and provider/treasury split.
pub fn execute_rust_skill_burn(
    caller: &mut RustAccountState,
    provider_pool: &mut RustAccountState,
    burn_treasury: &mut RustAccountState,
    skill_code: &str,
    total_gas: u128,
    burn_bps: u128, // basis points out of 10_000 (e.g., 1500 = 15%)
) -> Result<SkillGasRollupReceipt, LedgerError> {
    if burn_bps > 10_000 {
        return Err(LedgerError::InvalidSplitTotal);
    }
    if caller.asd_gas_units < total_gas {
        return Err(LedgerError::InsufficientAsdGas);
    }

    let burned_gas = total_gas
        .checked_mul(burn_bps)
        .ok_or(LedgerError::Overflow)?
        / 10_000;
    let provider_gas = total_gas
        .checked_sub(burned_gas)
        .ok_or(LedgerError::Overflow)?;

    caller.asd_gas_units = caller
        .asd_gas_units
        .checked_sub(total_gas)
        .ok_or(LedgerError::Overflow)?;
    provider_pool.asd_gas_units = provider_pool
        .asd_gas_units
        .checked_add(provider_gas)
        .ok_or(LedgerError::Overflow)?;
    burn_treasury.asd_gas_units = burn_treasury
        .asd_gas_units
        .checked_add(burned_gas)
        .ok_or(LedgerError::Overflow)?;
    caller.nonce = caller.nonce.saturating_add(1);

    let leaves = vec![
        merkle_por::hash_account_leaf(caller),
        merkle_por::hash_account_leaf(provider_pool),
        merkle_por::hash_account_leaf(burn_treasury),
    ];
    let state_root_hex = merkle_por::compute_merkle_root_hex(&leaves);

    Ok(SkillGasRollupReceipt {
        caller_site: caller.owner_site.clone(),
        skill_code: skill_code.to_string(),
        total_gas,
        provider_gas,
        burned_gas,
        new_nonce: caller.nonce,
        state_root_hex,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_u128_skill_burn_and_merkle_root() {
        let mut sofa = RustAccountState::new(
            "ACC-SOFA",
            "sofayes.com",
            4_200_000_000_000,
            450_000_000,
        );
        let mut pool = RustAccountState::new(
            "ACC-POOL",
            "shinemight.com",
            2_100_000_000_000,
            150_000_000,
        );
        let mut burn = RustAccountState::new(
            "ACC-BURN",
            "asdcoin.com",
            0,
            35_000_000,
        );

        let receipt = execute_rust_skill_burn(
            &mut sofa,
            &mut pool,
            &mut burn,
            "SKILL_06_IDLES",
            100_000,
            1500, // 15% burn
        )
        .expect("burn should succeed");

        assert_eq!(receipt.burned_gas, 15_000);
        assert_eq!(receipt.provider_gas, 85_000);
        assert_eq!(sofa.asd_gas_units, 449_900_000);
        assert_eq!(receipt.state_root_hex.len(), 66); // 0x + 64 hex chars
    }
}

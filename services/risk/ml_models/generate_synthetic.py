"""
generate_synthetic.py — Multi-Tier Continuous Risk Synthetic Dataset Generator
Generates realistic on-chain fund flows with continuous target risk scores [0.05 to 0.99]
across 12 distinct topological and behavioral archetypes.
"""

import sys
from pathlib import Path

# Ensure services/risk root is on sys.path
RISK_ROOT = Path(__file__).parent.parent
if str(RISK_ROOT) not in sys.path:
    sys.path.insert(0, str(RISK_ROOT))

import json
import random
import numpy as np
from datetime import datetime, timedelta
from constants import ETH_USD_PRICE, KNOWN_DEX_ROUTERS
from graph_analytics.network_metrics import build_digraph_from_hops, compute_graph_metrics
from ml_models.features import build_feature_vector

DATA_DIR = RISK_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

FAKE_ADDRESSES = [f"0x{i:02x}" + "a" * 36 + f"{i:02x}" for i in range(150)]
DEX_ROUTER_LIST = list(KNOWN_DEX_ROUTERS)


def make_timestamp(base: datetime, offset_sec: int) -> str:
    return (base + timedelta(seconds=offset_sec)).isoformat() + "Z"


def build_hop(index, from_addr, to_addr, usd, ts, internal=False, token=None):
    return {
        "hopIndex": index,
        "fromAddress": from_addr,
        "toAddress": to_addr,
        "amountEth": usd / ETH_USD_PRICE,
        "txHash": f"0x{index:04x}" + "b" * 56 + f"{index:04x}",
        "txTimestamp": ts,
        "tokenSymbol": token or "ETH",
        "tokenAmount": usd if token else usd / ETH_USD_PRICE,
        "usdValue": usd,
        "isInternalTx": internal,
    }


def make_row(hops, terminal_type, dest_prior_txs, tree_data=None, base_risk=0.5):
    root_addr = hops[0]["fromAddress"] if hops else "unknown"
    G = build_digraph_from_hops(hops, root_address=root_addr)
    metrics = compute_graph_metrics(G, hops)
    vec = build_feature_vector(hops, metrics, terminal_type, dest_prior_txs, tree_data)
    
    # Calculate calibrated continuous target score with realistic noise
    target_risk = float(np.clip(base_risk + random.gauss(0, 0.02), 0.03, 0.99))
    return vec.tolist(), target_risk


# === 1. TIER 1: BENIGN / MINIMAL THREAT (Target Risk: 0.05 – 0.22) ===

def gen_p2p_direct(n=250):
    """Tier 1: 1-hop direct transfer between individual users."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(20, 25000)
        hops = [build_hop(1, FAKE_ADDRESSES[0], FAKE_ADDRESSES[1], usd, make_timestamp(base, random.randint(600, 86400 * 5)))]
        dest_txs = random.choice([0, 1, random.randint(5, 500)])
        risk = random.uniform(0.05, 0.16)
        rows.append(make_row(hops, "inconclusive", dest_txs, base_risk=risk))
    return rows


def gen_direct_exchange_deposit(n=250):
    """Tier 1: 1-2 hops directly to a known verified exchange (e.g. Binance / Coinbase)."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(50, 80000)
        hop_count = random.randint(1, 2)
        hops, offset = [], 0
        addrs = random.sample(FAKE_ADDRESSES, hop_count + 1)
        for i in range(hop_count):
            offset += random.randint(3600, 86400 * 2)  # Multi-hour / organic
            hops.append(build_hop(i + 1, addrs[i], addrs[i + 1], usd, make_timestamp(base, offset)))
        dest_txs = random.randint(50, 5000)
        risk = random.uniform(0.12, 0.22)
        rows.append(make_row(hops, "exchange", dest_txs, base_risk=risk))
    return rows


def gen_payroll_star(n=200):
    """Tier 1: Legitimate 1-to-many star distribution (payroll/rewards, 0 fan-in)."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        total_usd = random.uniform(500, 150000)
        fan = random.randint(3, 8)
        root = FAKE_ADDRESSES[0]
        hops = []
        for i in range(fan):
            ts = make_timestamp(base, random.randint(3600, 86400))
            hops.append(build_hop(i + 1, root, FAKE_ADDRESSES[i + 1], total_usd / fan, ts))
        dest_txs = random.randint(10, 1000)
        risk = random.uniform(0.18, 0.28)
        rows.append(
            make_row(
                hops,
                "inconclusive",
                dest_txs,
                tree_data={
                    "totalBranches": fan,
                    "exchangeBranches": 0,
                    "taintCoveragePercent": 100.0,
                    "totalFanOutNodes": 1,
                    "totalFanInNodes": 0,
                },
                base_risk=risk,
            )
        )
    return rows


# === 2. TIER 2: LOW / MINOR ANOMALY (Target Risk: 0.25 – 0.45) ===

def gen_defi_trading(n=200):
    """Tier 2: Legitimate DeFi trading on Uniswap/SushiSwap routers."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(200, 20000)
        dex_router = random.choice(DEX_ROUTER_LIST)
        hops = [
            build_hop(1, FAKE_ADDRESSES[0], dex_router, usd, make_timestamp(base, random.randint(1800, 36000)), internal=True),
            build_hop(2, dex_router, FAKE_ADDRESSES[0], usd * 0.99, make_timestamp(base, random.randint(36000, 86400))),
        ]
        dest_txs = random.randint(20, 2000)
        risk = random.uniform(0.28, 0.40)
        rows.append(make_row(hops, "exchange", dest_txs, base_risk=risk))
    return rows


def gen_slow_multihop_hold(n=200):
    """Tier 2: 3-5 hops across weeks/months with minor organic decay."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(100, 40000)
        hop_count = random.randint(3, 5)
        hops, offset = [], 0
        addrs = random.sample(FAKE_ADDRESSES, hop_count + 1)
        for i in range(hop_count):
            offset += random.randint(86400, 86400 * 14)  # 1 day to 2 weeks
            usd *= random.uniform(0.90, 1.0)
            hops.append(build_hop(i + 1, addrs[i], addrs[i + 1], usd, make_timestamp(base, offset)))
        dest_txs = random.randint(5, 500)
        risk = random.uniform(0.32, 0.45)
        rows.append(make_row(hops, "inconclusive", dest_txs, base_risk=risk))
    return rows


# === 3. TIER 3: MEDIUM SUSPICION (Target Risk: 0.48 – 0.68) ===

def gen_gradual_peeling_chain(n=250):
    """Tier 3: Moderate peeling chain (20-30% peel per hop) with moderate intervals."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(500, 80000)
        hop_count = random.randint(3, 6)
        hops, offset = [], 0
        addrs = random.sample(FAKE_ADDRESSES, hop_count + 1)
        for i in range(hop_count):
            offset += random.randint(1800, 21600)  # 30 mins to 6 hours
            usd *= random.uniform(0.70, 0.82)
            hops.append(build_hop(i + 1, addrs[i], addrs[i + 1], usd, make_timestamp(base, offset)))
        term = "exchange" if random.random() < 0.50 else "inconclusive"
        dest_txs = random.choice([0, 1, random.randint(5, 100)])
        risk = random.uniform(0.50, 0.66)
        rows.append(make_row(hops, term, dest_txs, base_risk=risk))
    return rows


def gen_mild_fanout_dispersion(n=200):
    """Tier 3: 3-5 branch fan-out with medium velocity."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        total_usd = random.uniform(500, 100000)
        fan = random.randint(3, 5)
        root = FAKE_ADDRESSES[0]
        hops = []
        for i in range(fan):
            ts = make_timestamp(base, random.randint(900, 7200))
            hops.append(build_hop(i + 1, root, FAKE_ADDRESSES[i + 1], total_usd / fan, ts))
        dest_txs = random.choice([0, random.randint(1, 50)])
        risk = random.uniform(0.55, 0.68)
        rows.append(
            make_row(
                hops,
                "inconclusive",
                dest_txs,
                tree_data={
                    "totalBranches": fan,
                    "exchangeBranches": 1 if random.random() < 0.4 else 0,
                    "taintCoveragePercent": 90.0,
                    "totalFanOutNodes": 1,
                    "totalFanInNodes": 0,
                },
                base_risk=risk,
            )
        )
    return rows


# === 4. TIER 4: HIGH RISK / ACTIVE LAYERING (Target Risk: 0.70 – 0.86) ===

def gen_rapid_forwarding(n=250):
    """Tier 4: 3-8 hops executed in rapid succession (<15 minutes each)."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(200, 120000)
        hop_count = random.randint(4, 8)
        hops, offset = [], 0
        addrs = random.sample(FAKE_ADDRESSES, hop_count + 1)
        for i in range(hop_count):
            offset += random.randint(30, 600)  # 30s to 10 min
            hops.append(build_hop(i + 1, addrs[i], addrs[i + 1], usd * (0.98**i), make_timestamp(base, offset)))
        term = "exchange" if random.random() < 0.65 else "inconclusive"
        dest_txs = random.choice([0, 1, random.randint(2, 60)])
        risk = random.uniform(0.72, 0.84)
        rows.append(make_row(hops, term, dest_txs, base_risk=risk))
    return rows


def gen_dex_contract_obfuscation(n=200):
    """Tier 4: Routing through DEX routers rapidly to break direct address attribution."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(300, 150000)
        dex_router = random.choice(DEX_ROUTER_LIST)
        hops = [
            build_hop(1, FAKE_ADDRESSES[0], dex_router, usd, make_timestamp(base, 60), internal=True),
            build_hop(2, dex_router, FAKE_ADDRESSES[1], usd * 0.97, make_timestamp(base, 150)),
            build_hop(3, FAKE_ADDRESSES[1], FAKE_ADDRESSES[2], usd * 0.95, make_timestamp(base, 360)),
        ]
        term = "exchange" if random.random() < 0.70 else "inconclusive"
        dest_txs = random.choice([0, random.randint(1, 40)])
        risk = random.uniform(0.74, 0.85)
        rows.append(make_row(hops, term, dest_txs, base_risk=risk))
    return rows


def gen_aggressive_peeling(n=250):
    """Tier 4: Aggressive value peeling (30-60% drops) with burner wallets."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        usd = random.uniform(500, 250000)
        hop_count = random.randint(4, 9)
        hops, offset = [], 0
        addrs = random.sample(FAKE_ADDRESSES, hop_count + 1)
        for i in range(hop_count):
            offset += random.randint(45, 1800)
            usd *= random.uniform(0.45, 0.75)
            hops.append(build_hop(i + 1, addrs[i], addrs[i + 1], usd, make_timestamp(base, offset)))
        term = "exchange" if random.random() < 0.60 else "inconclusive"
        dest_txs = random.choice([0, 0, random.randint(1, 30)])
        risk = random.uniform(0.78, 0.88)
        rows.append(make_row(hops, term, dest_txs, base_risk=risk))
    return rows


# === 5. TIER 5: CRITICAL THREAT / SOPHISTICATED LAUNDERING (Target Risk: 0.88 – 0.99) ===

def gen_hourglass_funneling(n=250):
    """Tier 5: Hourglass pattern (Fan-Out to intermediary mules -> Re-convergence at collector)."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        total_usd = random.uniform(1000, 350000)
        fan = random.randint(3, 7)
        hops = []
        for i in range(fan):
            hops.append(build_hop(i + 1, FAKE_ADDRESSES[0], FAKE_ADDRESSES[i + 1], total_usd / fan, make_timestamp(base, i * 45)))
        for i in range(fan):
            hops.append(build_hop(fan + i + 1, FAKE_ADDRESSES[i + 1], FAKE_ADDRESSES[fan + 1], (total_usd / fan) * 0.97, make_timestamp(base, 400 + i * 45)))
        term = "exchange" if random.random() < 0.70 else "inconclusive"
        dest_txs = random.choice([0, 1, random.randint(5, 150)])
        risk = random.uniform(0.88, 0.95)
        rows.append(
            make_row(
                hops,
                term,
                dest_txs,
                tree_data={
                    "totalBranches": fan,
                    "exchangeBranches": 1 if term == "exchange" else 0,
                    "taintCoveragePercent": 92.0,
                    "totalFanOutNodes": 1,
                    "totalFanInNodes": 1,
                },
                base_risk=risk,
            )
        )
    return rows


def gen_complex_multibranch_dags(n=350):
    """Tier 5: Large-scale multi-branch DAG tree (12-30 hops, multiple fan-outs and fan-ins, high centrality)."""
    rows = []
    for _ in range(n):
        base = datetime(2024, random.randint(1, 12), random.randint(1, 28), 12, 0)
        total_usd = random.uniform(2000, 800000)
        branch_count = random.randint(8, 20)
        hop_count = random.randint(14, 30)
        hops = []

        cur_offset = 0
        for i in range(hop_count):
            cur_offset += random.randint(30, 7200)
            u_from = FAKE_ADDRESSES[i % 10]
            u_to = FAKE_ADDRESSES[(i + 1) % 18]
            hops.append(build_hop(i + 1, u_from, u_to, (total_usd / branch_count) * random.uniform(0.75, 1.25), make_timestamp(base, cur_offset)))

        term = "exchange" if random.random() < 0.55 else "inconclusive"
        dest_txs = random.choice([0, 1, 5, 25, 66, random.randint(0, 300)])
        risk = random.uniform(0.92, 0.99)
        rows.append(
            make_row(
                hops,
                term,
                dest_txs,
                tree_data={
                    "totalBranches": branch_count,
                    "exchangeBranches": random.randint(0, 3),
                    "taintCoveragePercent": random.uniform(70.0, 100.0),
                    "totalFanOutNodes": random.randint(2, 6),
                    "totalFanInNodes": random.randint(1, 5),
                },
                base_risk=risk,
            )
        )
    return rows


def generate_all():
    print("Generating continuous multi-tier synthetic dataset...")
    all_samples = []

    generators = [
        gen_p2p_direct,
        gen_direct_exchange_deposit,
        gen_payroll_star,
        gen_defi_trading,
        gen_slow_multihop_hold,
        gen_gradual_peeling_chain,
        gen_mild_fanout_dispersion,
        gen_rapid_forwarding,
        gen_dex_contract_obfuscation,
        gen_aggressive_peeling,
        gen_hourglass_funneling,
        gen_complex_multibranch_dags,
    ]

    for gen_fn in generators:
        samples = gen_fn()
        all_samples.extend(samples)
        print(f"  + Generated {len(samples)} samples from {gen_fn.__name__}")

    random.shuffle(all_samples)

    out_file = DATA_DIR / "synthetic_continuous.jsonl"
    with open(out_file, "w") as f:
        for feat_vec, target_risk in all_samples:
            f.write(json.dumps({"features": feat_vec, "target_risk": round(target_risk, 4)}) + "\n")

    print(f"\nSuccessfully generated {len(all_samples)} total calibrated continuous samples.")
    print(f"Saved dataset to {out_file}")


if __name__ == "__main__":
    generate_all()

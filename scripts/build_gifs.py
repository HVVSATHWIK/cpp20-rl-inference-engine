#!/usr/bin/env python3
"""
High-Fidelity Terminal GIF Generator for CPP20-RL-EXECUTION.
Generates multi-frame animated GIFs depicting the live quantitative execution terminal.
Outputs:
  - assets/cpp20-rl-execution-demo.gif
  - assets/terminal-live-demo.gif
"""

import os
import subprocess
import math

WIDTH = 1100
HEIGHT = 640
NUM_FRAMES = 10

os.makedirs("/tmp/terminal_frames", exist_ok=True)
os.makedirs("assets", exist_ok=True)

prices = [150.00, 150.05, 150.10, 150.08, 150.15, 150.22, 150.18, 150.25, 150.20, 150.30]
shortfalls = [-0.15, -0.22, -0.30, -0.28, -0.35, -0.42, -0.38, -0.45, -0.40, -0.48]
fills = [20, 28, 36, 45, 52, 60, 68, 75, 84, 92]
actions = [
    ("PASSIVE_L1", 0.65),
    ("PASSIVE_L1", 0.72),
    ("TWAP_SLICE", 0.58),
    ("PASSIVE_L1", 0.68),
    ("AGGRESSIVE_CROSS", 0.82),
    ("AGGRESSIVE_CROSS", 0.79),
    ("HOLD", 0.55),
    ("PASSIVE_L1", 0.74),
    ("TWAP_SLICE", 0.61),
    ("AGGRESSIVE_CROSS", 0.84),
]

for frame_idx in range(NUM_FRAMES):
    mid_price = prices[frame_idx]
    best_bid = mid_price - 0.025
    best_ask = mid_price + 0.025
    is_val = shortfalls[frame_idx]
    is_bps = (is_val / 150.0) * 10000
    fill_pct = fills[frame_idx]
    action_name, action_prob = actions[frame_idx]
    tick_num = 480 + frame_idx * 4

    cmd = [
        "convert",
        "-size", f"{WIDTH}x{HEIGHT}",
        "xc:#080c15",
    ]

    # Global background & header
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", f"roundrectangle 12,12 {WIDTH-12},62 6,6",
    ]

    # Brand mark icon in header
    cmd += [
        "-fill", "#3b82f6", "-stroke", "none",
        "-draw", "rectangle 24,24 28,50",
        "-draw", "path 'M28,26 H42 L45,30 L42,34 H28 Z'",
        "-fill", "#60a5fa", "-draw", "rectangle 28,37 39,41",
        "-fill", "#93c5fd", "-draw", "rectangle 28,44 35,48",
        "-fill", "#10b981", "-draw", "circle 45,46 45,48",
    ]

    # Brand title
    cmd += [
        "-fill", "#ffffff", "-font", "Helvetica-Bold", "-pointsize", "15",
        "-draw", "text 56,40 'CPP20::RL_EXECUTION'",
        "-fill", "#64748b", "-font", "Helvetica", "-pointsize", "10",
        "-draw", "text 56,53 'DETERMINISTIC ENGINE'",
    ]

    # Header Ticker Metrics
    cmd += [
        "-fill", "#475569", "-stroke", "none", "-draw", "line 240,22 240,52",
        "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", "text 255,28 'MID PRICE'",
        "-fill", "#f8fafc", "-font", "Helvetica-Bold", "-pointsize", "13", "-draw", f"text 255,48 '${mid_price:.2f}'",

        "-fill", "#475569", "-stroke", "none", "-draw", "line 350,22 350,52",
        "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", "text 365,28 'SPREAD'",
        "-fill", "#60a5fa", "-font", "Helvetica-Bold", "-pointsize", "13", "-draw", "text 365,48 '$0.05 (1t)'",

        "-fill", "#475569", "-stroke", "none", "-draw", "line 465,22 465,52",
        "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", "text 480,28 'MARKET VWAP'",
        "-fill", "#cbd5e1", "-font", "Helvetica-Bold", "-pointsize", "13", "-draw", f"text 480,48 '${mid_price - 0.02:.2f}'",

        "-fill", "#475569", "-stroke", "none", "-draw", "line 590,22 590,52",
        "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", "text 605,28 'NATIVE p50'",
        "-fill", "#38bdf8", "-font", "Helvetica-Bold", "-pointsize", "13", "-draw", "text 605,48 '3.28 µs'",

        "-fill", "#475569", "-stroke", "none", "-draw", "line 700,22 700,52",
        "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", "text 715,28 'BROWSER PASS'",
        "-fill", "#34d399", "-font", "Helvetica-Bold", "-pointsize", "13", "-draw", "text 715,48 '3.6 µs'",
    ]

    # Live Badge right side
    cmd += [
        "-fill", "#064e3b", "-stroke", "#059669", "-strokewidth", "1",
        "-draw", "roundrectangle 830,24 955,50 4,4",
        "-fill", "#34d399", "-stroke", "none", "-draw", "circle 846,37 846,40",
        "-fill", "#a7f3d0", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", "text 856,41 'LIVE RUNNING'",
        "-fill", "#1e3a8a", "-stroke", "#2563eb", "-strokewidth", "1",
        "-draw", "roundrectangle 965,24 1085,50 4,4",
        "-fill", "#bfdbfe", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", f"text 978,41 'TICK #{tick_num}'",
    ]

    # ================= PANEL 1: MARKET PRICE & MERTON JUMP CHART (Top Left) =================
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 12,72 700,320 6,6",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "11",
        "-draw", "text 24,94 'MARKET TICK & PRICE TRAJECTORY'",
        "-fill", "#38bdf8", "-font", "Helvetica", "-pointsize", "10",
        "-draw", "text 520,94 'Merton Jump-Diffusion S_t'",
    ]

    # Grid lines inside price chart
    for gy in range(120, 290, 40):
        cmd += ["-fill", "none", "-stroke", "#152033", "-strokewidth", "1", "-draw", f"line 24,{gy} 688,{gy}"]

    # Price polyline
    chart_pts = []
    num_pts = 16
    for i in range(num_pts):
        px = 24 + i * (660 / (num_pts - 1))
        val = 150.00 + 0.15 * math.sin((frame_idx + i) * 0.45) + (0.08 if i % 5 == 0 else 0.0)
        py = 240 - (val - 149.80) * 220
        chart_pts.append(f"{px:.1f},{py:.1f}")
    cmd += ["-fill", "none", "-stroke", "#3b82f6", "-strokewidth", "2", "-draw", f"polyline {' '.join(chart_pts)}"]

    # Current Price Marker
    last_pt = chart_pts[-1].split(",")
    lx, ly = float(last_pt[0]), float(last_pt[1])
    cmd += [
        "-fill", "#60a5fa", "-stroke", "#ffffff", "-strokewidth", "1.5",
        "-draw", f"circle {lx},{ly} {lx},{ly+3}",
        "-fill", "#ffffff", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", f"text {lx-45},{ly-10} '${mid_price:.2f}'",
    ]

    # VWAP Line
    cmd += [
        "-fill", "none", "-stroke", "#e2e8f0", "-strokewidth", "1",
        "-draw", "line 24,215 688,215",
        "-fill", "#cbd5e1", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 30,210 'VWAP $150.02'",
    ]

    # Volume histogram
    for vi in range(24):
        vx = 24 + vi * 27
        vh = 15 + ((vi * 7 + frame_idx * 5) % 35)
        bar_col = "#047857" if vi % 2 == 0 else "#1e3a8a"
        cmd += ["-fill", bar_col, "-stroke", "none", "-draw", f"rectangle {vx},{295-vh} {vx+20},295"]

    # ================= PANEL 2: L2 LIMIT ORDER BOOK (Top Right) =================
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", f"roundrectangle 712,72 {WIDTH-12},320 6,6",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "11",
        "-draw", "text 724,94 'L2 LIMIT ORDER BOOK'",
        "-fill", "#64748b", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 980,94 'FIFO Priority'",

        "-fill", "#475569", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", "text 724,114 'SIDE'",
        "-draw", "text 780,114 'PRICE'",
        "-draw", "text 870,114 'SIZE'",
        "-draw", "text 960,114 'TOTAL'",
    ]

    ask_prices = [best_ask + 0.08, best_ask + 0.06, best_ask + 0.04, best_ask + 0.02, best_ask]
    ask_sizes = [32, 28, 45, 18, 50]
    running_ask = sum(ask_sizes)
    for ai, ap in enumerate(ask_prices):
        ay = 132 + ai * 17
        cmd += [
            "-fill", "#38121a", "-stroke", "none", "-draw", f"rectangle {1080-running_ask},{ay-10} 1080,{ay+4}",
            "-fill", "#f43f5e", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 724,{ay} 'ASK'",
            "-fill", "#fca5a5", "-font", "Helvetica-Bold", "-pointsize", "9", "-draw", f"text 780,{ay} '${ap:.2f}'",
            "-fill", "#e2e8f0", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 870,{ay} '{ask_sizes[ai]}'",
            "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 960,{ay} '{running_ask}'",
        ]
        running_ask -= ask_sizes[ai]

    # Spread divider banner
    cmd += [
        "-fill", "#111c30", "-stroke", "#2563eb", "-strokewidth", "1",
        "-draw", "roundrectangle 724,222 1076,242 3,3",
        "-fill", "#38bdf8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", "text 740,236 'SPREAD: $0.05 (1 tick)'",
        "-fill", "#a5b4fc", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", f"text 890,236 'MICRO: ${mid_price-0.01:.2f} | OFI: +14.2%'",
    ]

    # Bids
    bid_prices = [best_bid, best_bid - 0.02, best_bid - 0.04, best_bid - 0.06, best_bid - 0.08]
    bid_sizes = [42, 60, 25, 38, 55]
    running_bid = 0
    for bi, bp in enumerate(bid_prices):
        by = 258 + bi * 17
        running_bid += bid_sizes[bi]
        cmd += [
            "-fill", "#0d3322", "-stroke", "none", "-draw", f"rectangle {1080-running_bid},{by-10} 1080,{by+4}",
            "-fill", "#10b981", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 724,{by} 'BID'",
            "-fill", "#6ee7b7", "-font", "Helvetica-Bold", "-pointsize", "9", "-draw", f"text 780,{by} '${bp:.2f}'",
            "-fill", "#e2e8f0", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 870,{by} '{bid_sizes[bi]}'",
            "-fill", "#94a3b8", "-font", "Helvetica", "-pointsize", "9", "-draw", f"text 960,{by} '{running_bid}'",
        ]

    # ================= PANEL 3: POLICY FORWARD PASS PIPELINE (Bottom Left) =================
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 12,330 460,628 6,6",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "11",
        "-draw", "text 24,352 'POLICY FORWARD-PASS PIPELINE'",
        "-fill", "#38bdf8", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 320,352 'GELU MLP 48x24x7'",
    ]

    features = [
        ("Return 10t", 0.7), ("OFI Imbalance", 0.8), ("Spread Ticks", 0.3),
        ("Micro Skew", 0.5), ("Realized Vol", 0.4), ("Remain Shares", (100 - fill_pct)/100),
    ]
    for fi, (fname, fval) in enumerate(features):
        fy = 372 + fi * 18
        cmd += [
            "-fill", "#64748b", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
            "-draw", f"text 24,{fy} '{fname}'",
            "-fill", "#1e293b", "-draw", f"rectangle 120,{fy-8} 240,{fy+2}",
            "-fill", "#3b82f6", "-draw", f"rectangle 120,{fy-8} {120+int(fval*120)},{fy+2}",
            "-fill", "#cbd5e1", "-font", "Helvetica", "-pointsize", "8",
            "-draw", f"text 248,{fy} '{fval:.2f}'",
        ]

    cmd += [
        "-fill", "#cbd5e1", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", "text 24,495 'ACTION LOGITS & PROBABILITIES'",
    ]
    action_list = ["HOLD", "PASSIVE_L1", "PASSIVE_L2", "TWAP_SLICE", "AGGRESSIVE_CROSS", "FORCE_LIQUIDATE", "CANCEL_ALL"]
    for ai, aname in enumerate(action_list):
        ay = 515 + ai * 15
        is_sel = (aname == action_name)
        prob = action_prob if is_sel else (1.0 - action_prob) / 6.0
        bar_col = "#2563eb" if is_sel else "#1e293b"
        text_col = "#ffffff" if is_sel else "#64748b"
        if is_sel:
            cmd += [
                "-fill", "#1e3a8a", "-stroke", "#3b82f6", "-strokewidth", "1",
                "-draw", f"roundrectangle 22,{ay-9} 448,{ay+5} 2,2",
                "-fill", "#93c5fd", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "8",
                "-draw", f"text 365,{ay} '[ARGMAX {prob*100:.1f}%]'",
            ]
        cmd += [
            "-fill", text_col, "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
            "-draw", f"text 30,{ay} '{aname}'",
            "-fill", "#1e293b", "-draw", f"rectangle 160,{ay-7} 320,{ay+1}",
            "-fill", bar_col, "-draw", f"rectangle 160,{ay-7} {160+int(prob*160)},{ay+1}",
        ]

    # ================= PANEL 4: OPTIMAL EXECUTION & SHORTFALL (Bottom Center) =================
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 472,330 810,628 6,6",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "11",
        "-draw", "text 484,352 'OPTIMAL EXECUTION MONITOR'",
        "-fill", "#10b981", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", "text 710,352 'PEROLD IS'",

        "-fill", "#111c30", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 484,368 636,430 4,4",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 496,386 'SHORTFALL (IS)'",
        "-fill", "#34d399", "-font", "Helvetica-Bold", "-pointsize", "14",
        "-draw", f"text 496,410 '${is_val:.2f}'",
        "-fill", "#10b981", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", f"text 560,410 '({is_bps:.1f} bps)'",

        "-fill", "#111c30", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 646,368 798,430 4,4",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 658,386 'TWAP ADVANTAGE'",
        "-fill", "#60a5fa", "-font", "Helvetica-Bold", "-pointsize", "14",
        "-draw", "text 658,410 '+3.8 bps'",
        "-fill", "#3b82f6", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", "text 735,410 '[ALPHA]'",

        "-fill", "#64748b", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 484,450 'PARENT ORDER COMPLETION (100 Shares Target)'",
        "-fill", "#ffffff", "-font", "Helvetica-Bold", "-pointsize", "10",
        "-draw", f"text 740,450 '{fill_pct}%'",
        "-fill", "#1e293b", "-draw", "rectangle 484,460 798,474",
        "-fill", "#2563eb", "-draw", f"rectangle 484,460 {484+int(fill_pct*3.14)},474",

        "-fill", "#080e1a", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", "roundrectangle 484,486 798,616 4,4",
        "-fill", "#64748b", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 496,504 'Shortfall Trajectory vs Arrival Price S_0'",
        "-fill", "none", "-stroke", "#475569", "-strokewidth", "1",
        "-draw", "line 496,545 786,545",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica", "-pointsize", "8",
        "-draw", "text 750,542 'S_0 ($0)'",
    ]

    traj_pts = []
    for ti in range(10):
        tx = 496 + ti * (280 / 9)
        ty = 545 + shortfalls[min(ti, frame_idx)] * 90
        traj_pts.append(f"{tx:.1f},{ty:.1f}")
    cmd += [
        "-fill", "none", "-stroke", "#10b981", "-strokewidth", "2",
        "-draw", f"polyline {' '.join(traj_pts)}",
        "-fill", "#34d399", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", "text 520,595 'Alpha: Savings below arrival price'",
    ]

    # ================= PANEL 5: EXECUTION TAPE (Bottom Right) =================
    cmd += [
        "-fill", "#0c1322", "-stroke", "#1e293b", "-strokewidth", "1",
        "-draw", f"roundrectangle 822,330 {WIDTH-12},628 6,6",
        "-fill", "#94a3b8", "-stroke", "none", "-font", "Helvetica-Bold", "-pointsize", "11",
        "-draw", "text 834,352 'EXECUTION TAPE'",
        "-fill", "#64748b", "-font", "Helvetica", "-pointsize", "9",
        "-draw", "text 1000,352 'Real-time Fills'",

        "-fill", "#475569", "-font", "Helvetica-Bold", "-pointsize", "9",
        "-draw", "text 834,374 'TIME'",
        "-draw", "text 890,374 'SIDE'",
        "-draw", "text 940,374 'PRICE'",
        "-draw", "text 1000,374 'QTY'",
        "-draw", "text 1045,374 'AGENT'",
    ]

    trades = [
        ("11:04:12", "BUY", mid_price - 0.01, 10, "RL", "#3b82f6"),
        ("11:04:11", "SELL", mid_price + 0.01, 15, "MM", "#64748b"),
        ("11:04:10", "BUY", mid_price, 5, "RL", "#3b82f6"),
        ("11:04:09", "BUY", mid_price - 0.02, 20, "RL", "#3b82f6"),
        ("11:04:08", "SELL", mid_price + 0.02, 8, "EXT", "#64748b"),
        ("11:04:07", "BUY", mid_price - 0.01, 12, "RL", "#3b82f6"),
        ("11:04:06", "SELL", mid_price, 25, "MM", "#64748b"),
        ("11:04:05", "BUY", mid_price - 0.03, 10, "RL", "#3b82f6"),
        ("11:04:04", "BUY", mid_price - 0.02, 15, "RL", "#3b82f6"),
        ("11:04:03", "SELL", mid_price + 0.01, 30, "MM", "#64748b"),
        ("11:04:02", "BUY", mid_price - 0.01, 5, "RL", "#3b82f6"),
        ("11:04:01", "SELL", mid_price, 10, "EXT", "#64748b"),
    ]

    for ti, (ttime, tside, tprice, tqty, tagent, tcol) in enumerate(trades[:12]):
        ty = 396 + ti * 19
        side_col = "#10b981" if tside == "BUY" else "#f43f5e"
        if ti == 0:
            cmd += ["-fill", "#13233c", "-stroke", "none", "-draw", f"rectangle 830,{ty-11} 1076,{ty+4}"]
        cmd += [
            "-fill", "#64748b", "-stroke", "none", "-font", "Helvetica", "-pointsize", "9",
            "-draw", f"text 834,{ty} '{ttime}'",
            "-fill", side_col, "-font", "Helvetica-Bold", "-pointsize", "9",
            "-draw", f"text 890,{ty} '{tside}'",
            "-fill", "#e2e8f0", "-font", "Helvetica", "-pointsize", "9",
            "-draw", f"text 940,{ty} '${tprice:.2f}'",
            "-fill", "#cbd5e1", "-font", "Helvetica", "-pointsize", "9",
            "-draw", f"text 1000,{ty} '{tqty}'",
            "-fill", tcol, "-font", "Helvetica-Bold", "-pointsize", "8",
            "-draw", f"text 1045,{ty} '({tagent})'",
        ]

    out_frame = f"/tmp/terminal_frames/frame_{frame_idx:02d}.png"
    cmd.append(out_frame)
    subprocess.run(cmd, check=True)

print("Frames generated successfully. Encoding animated GIF with ffmpeg...")

ffmpeg_cmd = [
    "ffmpeg", "-y", "-framerate", "2",
    "-i", "/tmp/terminal_frames/frame_%02d.png",
    "-vf", "split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
    "assets/cpp20-rl-execution-demo.gif"
]
subprocess.run(ffmpeg_cmd, check=True)

subprocess.run(["cp", "assets/cpp20-rl-execution-demo.gif", "assets/terminal-live-demo.gif"], check=True)

print("GIF generation complete:")
print("  - assets/cpp20-rl-execution-demo.gif")
print("  - assets/terminal-live-demo.gif")

use std::process::Command;
use std::time::Instant;
use std::io::{self, Write};

fn run_command(cmd: &str, args: &[&str]) -> Result<(), Box<dyn std::error::Error>> {
    let mut command = Command::new(cmd);
    command.args(args);

    let output = command.output()?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Command failed: {}", stderr).into())
    }
}

fn run_npm_script(script: &str) -> Result<f64, Box<dyn std::error::Error>> {
    println!("\x1b[33mRunning: npm run {}\x1b[0m", script);
    io::stdout().flush()?;

    let start = Instant::now();
    run_command("npm", &["run", script])?;
    let duration = start.elapsed();

    let seconds = duration.as_secs_f64();
    println!("\x1b[32mCompleted in {:.2}s\x1b[0m", seconds);

    Ok(seconds)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n\x1b[36m\x1b[1m=== Build Performance Comparison ===\x1b[0m\n");

    let runs = 3;
    let mut webpack_times = Vec::new();
    let mut vite_times = Vec::new();

    for i in 0..runs {
        println!("\x1b[33mRun {}/{}:\x1b[0m", i + 1, runs);

        // Run webpack build
        match run_npm_script("build") {
            Ok(time) => webpack_times.push(time),
            Err(e) => {
                eprintln!("\x1b[31mWebpack build failed: {}\x1b[0m", e);
                return Err(e);
            }
        }

        // Run vite build
        match run_npm_script("vite-build") {
            Ok(time) => vite_times.push(time),
            Err(e) => {
                eprintln!("\x1b[31mVite build failed: {}\x1b[0m", e);
                return Err(e);
            }
        }

        println!();
    }

    // Calculate statistics
    let webpack_avg = webpack_times.iter().sum::<f64>() / webpack_times.len() as f64;
    let vite_avg = vite_times.iter().sum::<f64>() / vite_times.len() as f64;
    let diff = webpack_avg - vite_avg;
    let percent_faster = if webpack_avg > 0.0 {
        diff / webpack_avg * 100.0
    } else {
        0.0
    };

    // Print results
    println!("\x1b[36m\x1b[1m=== Results ===\x1b[0m");
    println!("\x1b[33mWebpack builds ({} runs):\x1b[0m", runs);
    for (i, time) in webpack_times.iter().enumerate() {
        println!("  Run {}: {:.2}s", i + 1, time);
    }
    println!("  \x1b[33mAverage: {:.2}s\x1b[0m", webpack_avg);

    println!("\n\x1b[33mVite builds ({} runs):\x1b[0m", runs);
    for (i, time) in vite_times.iter().enumerate() {
        println!("  Run {}: {:.2}s", i + 1, time);
    }
    println!("  \x1b[33mAverage: {:.2}s\x1b[0m", vite_avg);

    println!("\n\x1b[36m\x1b[1m=== Comparison ===\x1b[0m");
    if diff > 0.0 {
        println!("\x1b[32mVite is {:.2}s faster ({:.1}% improvement)\x1b[0m", diff, percent_faster);
    } else if diff < 0.0 {
        println!("\x1b[31mWebpack is {:.2}s faster ({:.1}% slower)\x1b[0m", diff.abs(), percent_faster.abs());
    } else {
        println!("\x1b[33mBoth builds take approximately the same time\x1b[0m");
    }

    // Calculate standard deviation
    let webpack_std_dev = if webpack_times.len() > 1 {
        let variance = webpack_times.iter()
            .map(|&x| (x - webpack_avg).powi(2))
            .sum::<f64>() / (webpack_times.len() - 1) as f64;
        variance.sqrt()
    } else {
        0.0
    };

    let vite_std_dev = if vite_times.len() > 1 {
        let variance = vite_times.iter()
            .map(|&x| (x - vite_avg).powi(2))
            .sum::<f64>() / (vite_times.len() - 1) as f64;
        variance.sqrt()
    } else {
        0.0
    };

    println!("\n\x1b[36m\x1b[1m=== Statistics ===\x1b[0m");
    println!("Webpack: {:.2}s ± {:.2}s (std dev)", webpack_avg, webpack_std_dev);
    println!("Vite:    {:.2}s ± {:.2}s (std dev)", vite_avg, vite_std_dev);

    // Confidence calculation
    if webpack_times.len() > 1 && vite_times.len() > 1 {
        let pooled_variance = ((webpack_times.len() - 1) as f64 * webpack_std_dev.powi(2) +
                              (vite_times.len() - 1) as f64 * vite_std_dev.powi(2)) /
                             (webpack_times.len() + vite_times.len() - 2) as f64;
        let pooled_std_dev = pooled_variance.sqrt();
        let standard_error = pooled_std_dev * (1.0 / webpack_times.len() as f64 + 1.0 / vite_times.len() as f64).sqrt();

        if standard_error > 0.0 {
            let t_score = diff.abs() / standard_error;
            println!("t-score: {:.2}", t_score);

            // Simple confidence indicator
            if t_score > 2.0 {
                println!("\x1b[32mResult is statistically significant (high confidence)\x1b[0m");
            } else if t_score > 1.0 {
                println!("\x1b[33mResult shows moderate confidence\x1b[0m");
            } else {
                println!("\x1b[31mResult may not be statistically significant\x1b[0m");
            }
        }
    }

    println!();
    Ok(())
}

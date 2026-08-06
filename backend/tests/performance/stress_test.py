import asyncio
import time
import httpx


API_URL = "http://localhost:8000"
CONCURRENT_REQUESTS = 50
TOTAL_REQUESTS = 500


async def send_request(client: httpx.AsyncClient, stats: dict) -> None:
    """Sends a health check request and records latency stats."""
    start = time.time()
    try:
        response = await client.get(f"{API_URL}/health")
        duration = time.time() - start
        
        stats["latencies"].append(duration)
        if response.status_code == 200:
            stats["success"] += 1
        else:
            stats["failed"] += 1
    except Exception as e:
        stats["failed"] += 1
        stats["errors"].append(str(e))


async def run_stress_test() -> None:
    """Orchestrates the stress load test runs."""
    print(f"=== Bid2Ride Stress Load Test ===")
    print(f"URL: {API_URL}")
    print(f"Concurrency Limit: {CONCURRENT_REQUESTS}")
    print(f"Total Requests Target: {TOTAL_REQUESTS}")

    stats = {
        "latencies": [],
        "success": 0,
        "failed": 0,
        "errors": []
    }

    limits = httpx.Limits(max_keepalive_connections=20, max_connections=CONCURRENT_REQUESTS)
    async with httpx.AsyncClient(limits=limits, timeout=5.0) as client:
        sem = asyncio.Semaphore(CONCURRENT_REQUESTS)
        
        async def worker():
            async with sem:
                await send_request(client, stats)

        tasks = [worker() for _ in range(TOTAL_REQUESTS)]
        
        start_time = time.time()
        await asyncio.gather(*tasks)
        total_duration = time.time() - start_time

    # Calculate summaries
    latencies = stats["latencies"]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0

    print("\n=== STRESS TEST RESULTS SUMMARY ===")
    print(f"Total Duration: {total_duration:.2f} seconds")
    print(f"Successful Requests: {stats['success']}")
    print(f"Failed Requests: {stats['failed']}")
    print(f"Average Latency: {avg_latency*1000:.2f} ms")
    print(f"Min Latency: {min_latency*1000:.2f} ms")
    print(f"Max Latency: {max_latency*1000:.2f} ms")
    print(f"Request rate: {len(latencies)/total_duration:.2f} req/sec")
    if stats["errors"]:
        print(f"Error samples: {stats['errors'][:5]}")


if __name__ == "__main__":
    asyncio.run(run_stress_test())

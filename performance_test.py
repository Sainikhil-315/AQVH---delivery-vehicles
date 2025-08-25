#!/usr/bin/env python3
"""
🚀 Performance Testing Script for Quantum Fleet VRP Solver
Comprehensive benchmarking of all optimizations
"""

import time
import requests
import json
import statistics
from typing import List, Dict, Any
import matplotlib.pyplot as plt
import numpy as np

class PerformanceTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {}
        
    def test_endpoint(self, endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
        """Test a single endpoint and measure response time"""
        url = f"{self.base_url}{endpoint}"
        
        start_time = time.time()
        try:
            if method == "GET":
                response = requests.get(url)
            elif method == "POST":
                response = requests.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            end_time = time.time()
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "response_time": (end_time - start_time) * 1000,  # Convert to ms
                    "status_code": response.status_code,
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "response_time": (end_time - start_time) * 1000,
                    "status_code": response.status_code,
                    "error": response.text
                }
        except Exception as e:
            end_time = time.time()
            return {
                "success": False,
                "response_time": (end_time - start_time) * 1000,
                "error": str(e)
            }
    
    def test_distance_matrix_caching(self, problem_sizes: List[int] = [4, 8, 12, 16]) -> Dict:
        """Test distance matrix caching performance"""
        print("🧪 Testing Distance Matrix Caching...")
        
        results = {}
        for size in problem_sizes:
            print(f"  Testing {size} locations...")
            
            # Generate test problem
            locations = [[i, i] for i in range(size)]
            problem = {
                "locations": locations,
                "num_vehicles": max(2, size // 4),
                "depot_index": 0
            }
            
            # First request (cache miss)
            first_result = self.test_endpoint("/solve/classical", "POST", {
                "problem": problem,
                "algorithm": "nearest_neighbor",
                "max_iterations": 100
            })
            
            # Second request (cache hit)
            second_result = self.test_endpoint("/solve/classical", "POST", {
                "problem": problem,
                "algorithm": "nearest_neighbor",
                "max_iterations": 100
            })
            
            if first_result["success"] and second_result["success"]:
                cache_miss_time = first_result["response_time"]
                cache_hit_time = second_result["response_time"]
                speedup = cache_miss_time / cache_hit_time if cache_hit_time > 0 else 0
                
                results[size] = {
                    "cache_miss_ms": cache_miss_time,
                    "cache_hit_ms": cache_hit_time,
                    "speedup": speedup,
                    "time_saved_ms": cache_miss_time - cache_hit_time
                }
                
                print(f"    Cache miss: {cache_miss_time:.2f}ms, Cache hit: {cache_hit_time:.2f}ms, Speedup: {speedup:.2f}x")
            else:
                print(f"    ❌ Failed for size {size}")
                results[size] = {"error": "Request failed"}
        
        return results
    
    def test_scalability(self, problem_sizes: List[int] = [4, 8, 12, 16, 20]) -> Dict:
        """Test scalability with different problem sizes"""
        print("📈 Testing Scalability...")
        
        results = {}
        for size in problem_sizes:
            print(f"  Testing {size} locations...")
            
            locations = [[i, i] for i in range(size)]
            problem = {
                "locations": locations,
                "num_vehicles": max(2, size // 4),
                "depot_index": 0
            }
            
            result = self.test_endpoint("/solve/classical", "POST", {
                "problem": problem,
                "algorithm": "nearest_neighbor",
                "max_iterations": 100
            })
            
            if result["success"]:
                results[size] = {
                    "response_time_ms": result["response_time"],
                    "problem_size": size,
                    "num_vehicles": problem["num_vehicles"]
                }
                print(f"    {size} locations: {result['response_time']:.2f}ms")
            else:
                print(f"    ❌ Failed for size {size}")
                results[size] = {"error": "Request failed"}
        
        return results
    
    def test_algorithm_comparison(self) -> Dict:
        """Test quantum vs classical algorithm performance"""
        print("⚡ Testing Algorithm Comparison...")
        
        problem = {
            "locations": [[0,0], [2,3], [5,1], [3,4]],
            "num_vehicles": 2,
            "depot_index": 0
        }
        
        # Test classical algorithm
        print("  Testing classical algorithm...")
        classical_result = self.test_endpoint("/solve/classical", "POST", {
            "problem": problem,
            "algorithm": "nearest_neighbor",
            "max_iterations": 100
        })
        
        # Test quantum algorithm
        print("  Testing quantum algorithm...")
        quantum_result = self.test_endpoint("/solve/quantum", "POST", {
            "problem": problem,
            "algorithm": "SPSA",
            "max_iterations": 50,
            "additional_params": {
                "p_layers": 2,
                "shots": 1024
            }
        })
        
        results = {
            "classical": classical_result,
            "quantum": quantum_result
        }
        
        if classical_result["success"] and quantum_result["success"]:
            classical_time = classical_result["response_time"]
            quantum_time = quantum_result["response_time"]
            print(f"    Classical: {classical_time:.2f}ms, Quantum: {quantum_time:.2f}ms")
        
        return results
    
    def test_concurrent_requests(self, num_requests: int = 10) -> Dict:
        """Test concurrent request handling"""
        print(f"🔄 Testing Concurrent Requests ({num_requests} requests)...")
        
        import concurrent.futures
        
        problem = {
            "locations": [[0,0], [2,3], [5,1], [3,4]],
            "num_vehicles": 2,
            "depot_index": 0
        }
        
        request_data = {
            "problem": problem,
            "algorithm": "nearest_neighbor",
            "max_iterations": 100
        }
        
        def make_request():
            return self.test_endpoint("/solve/classical", "POST", request_data)
        
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        total_time = (end_time - start_time) * 1000
        
        successful_requests = [r for r in results if r["success"]]
        failed_requests = [r for r in results if not r["success"]]
        
        if successful_requests:
            response_times = [r["response_time"] for r in successful_requests]
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            
            print(f"    Total time: {total_time:.2f}ms")
            print(f"    Successful: {len(successful_requests)}/{num_requests}")
            print(f"    Avg response: {avg_response_time:.2f}ms")
            print(f"    Min/Max: {min_response_time:.2f}ms / {max_response_time:.2f}ms")
        else:
            print("    ❌ All requests failed")
        
        return {
            "total_requests": num_requests,
            "successful_requests": len(successful_requests),
            "failed_requests": len(failed_requests),
            "total_time_ms": total_time,
            "results": results
        }
    
    def run_all_tests(self) -> Dict:
        """Run all performance tests"""
        print("🚀 Starting Comprehensive Performance Tests...")
        print("=" * 60)
        
        all_results = {}
        
        # Test 1: Distance Matrix Caching
        all_results["caching"] = self.test_distance_matrix_caching()
        print()
        
        # Test 2: Scalability
        all_results["scalability"] = self.test_scalability()
        print()
        
        # Test 3: Algorithm Comparison
        all_results["algorithms"] = self.test_algorithm_comparison()
        print()
        
        # Test 4: Concurrent Requests
        all_results["concurrency"] = self.test_concurrent_requests()
        print()
        
        # Test 5: Performance Metrics
        print("📊 Fetching Performance Metrics...")
        metrics_result = self.test_endpoint("/performance")
        all_results["metrics"] = metrics_result
        if metrics_result["success"]:
            print(f"    Cache hits: {metrics_result['data']['cache_performance']['hits']}")
            print(f"    Cache hit rate: {metrics_result['data']['cache_performance']['hit_rate_percent']}%")
        
        print("=" * 60)
        print("✅ All tests completed!")
        
        return all_results
    
    def generate_report(self, results: Dict) -> str:
        """Generate a comprehensive performance report"""
        report = []
        report.append("# 🚀 Performance Test Report")
        report.append("")
        report.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Caching Performance
        if "caching" in results:
            report.append("## 📊 Distance Matrix Caching Performance")
            report.append("")
            report.append("| Problem Size | Cache Miss (ms) | Cache Hit (ms) | Speedup | Time Saved (ms) |")
            report.append("|--------------|-----------------|----------------|---------|-----------------|")
            
            for size, data in results["caching"].items():
                if "error" not in data:
                    report.append(f"| {size} locations | {data['cache_miss_ms']:.2f} | {data['cache_hit_ms']:.2f} | {data['speedup']:.2f}x | {data['time_saved_ms']:.2f} |")
            report.append("")
        
        # Scalability
        if "scalability" in results:
            report.append("## 📈 Scalability Performance")
            report.append("")
            report.append("| Problem Size | Response Time (ms) | Num Vehicles |")
            report.append("|--------------|-------------------|--------------|")
            
            for size, data in results["scalability"].items():
                if "error" not in data:
                    report.append(f"| {size} locations | {data['response_time_ms']:.2f} | {data['num_vehicles']} |")
            report.append("")
        
        # Algorithm Comparison
        if "algorithms" in results:
            report.append("## ⚡ Algorithm Performance Comparison")
            report.append("")
            
            classical = results["algorithms"]["classical"]
            quantum = results["algorithms"]["quantum"]
            
            if classical["success"] and quantum["success"]:
                report.append(f"- **Classical Algorithm**: {classical['response_time']:.2f}ms")
                report.append(f"- **Quantum Algorithm**: {quantum['response_time']:.2f}ms")
                report.append(f"- **Performance Ratio**: {quantum['response_time']/classical['response_time']:.2f}x")
            report.append("")
        
        # Concurrency
        if "concurrency" in results:
            report.append("## 🔄 Concurrent Request Performance")
            report.append("")
            concurrency = results["concurrency"]
            report.append(f"- **Total Requests**: {concurrency['total_requests']}")
            report.append(f"- **Successful**: {concurrency['successful_requests']}")
            report.append(f"- **Failed**: {concurrency['failed_requests']}")
            report.append(f"- **Total Time**: {concurrency['total_time_ms']:.2f}ms")
            report.append("")
        
        # Performance Metrics
        if "metrics" in results and results["metrics"]["success"]:
            report.append("## 📊 System Performance Metrics")
            report.append("")
            metrics = results["metrics"]["data"]
            report.append(f"- **Cache Hit Rate**: {metrics['cache_performance']['hit_rate_percent']}%")
            report.append(f"- **Cache Size**: {metrics['cache_performance']['cache_size']}")
            report.append(f"- **Uptime**: {metrics['uptime_seconds']:.1f} seconds")
            report.append("")
        
        return "\n".join(report)

def main():
    """Main function to run performance tests"""
    print("🚀 Quantum Fleet VRP Solver - Performance Testing")
    print("=" * 60)
    
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            print("❌ Backend is not responding properly")
            return
    except requests.exceptions.RequestException:
        print("❌ Backend is not running. Please start the backend first:")
        print("   cd backend && python app.py")
        return
    
    print("✅ Backend is running and responding")
    print()
    
    # Run tests
    tester = PerformanceTester()
    results = tester.run_all_tests()
    
    # Generate and save report
    report = tester.generate_report(results)
    
    with open("performance_report.md", "w") as f:
        f.write(report)
    
    print("📄 Performance report saved to: performance_report.md")
    
    # Print summary
    print("\n📋 Test Summary:")
    print(f"  - Caching tests: {len(results.get('caching', {}))} problem sizes")
    print(f"  - Scalability tests: {len(results.get('scalability', {}))} problem sizes")
    print(f"  - Algorithm comparison: {'✅' if results.get('algorithms') else '❌'}")
    print(f"  - Concurrency test: {'✅' if results.get('concurrency') else '❌'}")
    print(f"  - Performance metrics: {'✅' if results.get('metrics') else '❌'}")

if __name__ == "__main__":
    main()
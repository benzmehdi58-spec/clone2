import time
import asyncio
from typing import Dict, Any, List

class CrossDomainCorrelator:
    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds

    def correlate(self, alert_buffer: List[Dict[Any, Any]]) -> None:
        """
        Scans the alert buffer for network and HDFS alerts that occurred
        within window_seconds of each other and links them.
        """
        if not alert_buffer or len(alert_buffer) < 2:
            return

        for i in range(len(alert_buffer)):
            alert1 = alert_buffer[i]
            source1 = alert1.get("source", "")
            
            # Ensure timestamps exist
            if "timestamp_epoch" not in alert1:
                alert1["timestamp_epoch"] = time.time()
                
            time1 = alert1["timestamp_epoch"]
            
            for j in range(i + 1, len(alert_buffer)):
                alert2 = alert_buffer[j]
                source2 = alert2.get("source", "")
                
                if "timestamp_epoch" not in alert2:
                    alert2["timestamp_epoch"] = time.time()
                    
                time2 = alert2["timestamp_epoch"]
                
                # If they are from different domains and within the window
                if source1 and source2 and source1 != source2:
                    if abs(time1 - time2) <= self.window_seconds:
                        # Link them
                        id1 = alert1.get("id") or alert1.get("block_id")
                        id2 = alert2.get("id") or alert2.get("block_id")
                        
                        if id1 and id2:
                            if "correlated_ids" not in alert1:
                                alert1["correlated_ids"] = []
                            if "correlated_ids" not in alert2:
                                alert2["correlated_ids"] = []
                                
                            if id2 not in alert1["correlated_ids"]:
                                alert1["correlated_ids"].append(id2)
                                alert1["severity"] = "critical" # Elevate severity
                            if id1 not in alert2["correlated_ids"]:
                                alert2["correlated_ids"].append(id1)
                                alert2["severity"] = "critical"

async def correlation_loop(app_state: Dict[str, Any]):
    correlator = CrossDomainCorrelator(window_seconds=300)
    print("[CORRELATOR] Started cross-domain threat correlation engine.")
    while True:
        try:
            alert_buffer = app_state.get("alert_buffer", [])
            correlator.correlate(alert_buffer)
        except Exception as e:
            print(f"[CORRELATOR] Error: {e}")
        await asyncio.sleep(10) # check every 10 seconds

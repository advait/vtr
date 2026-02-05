package main

import "time"

func nextBackoff(current time.Duration) time.Duration {
	if current <= 0 {
		return time.Second
	}
	next := current * 2
	if next > 5*time.Second {
		return 5 * time.Second
	}
	return next
}

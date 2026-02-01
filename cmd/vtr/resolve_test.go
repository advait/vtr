package main

import (
	"testing"

	proto "github.com/advait/vtrpc/proto"
)

func TestMatchSessionRefStripsCoordinatorPrefix(t *testing.T) {
	sessions := []*proto.Session{{
		Id:   "id-1",
		Name: "demo",
	}}

	id, label, err := matchSessionRef("spoke-a:demo", sessions)
	if err != nil {
		t.Fatalf("expected match for prefixed name: %v", err)
	}
	if id != "id-1" || label != "demo" {
		t.Fatalf("unexpected match result id=%q label=%q", id, label)
	}

	id, label, err = matchSessionRef("spoke-a:id-1", sessions)
	if err != nil {
		t.Fatalf("expected match for prefixed id: %v", err)
	}
	if id != "id-1" || label != "demo" {
		t.Fatalf("unexpected match result id=%q label=%q", id, label)
	}
}

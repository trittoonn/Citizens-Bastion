package main

import (
	"log"
	"net/http"
	"os"

	"github.com/trittoonn/Citizens-Bastion/backend/internal/lobby"
	"github.com/trittoonn/Citizens-Bastion/backend/internal/server"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mgr := lobby.NewManager()
	srv := server.NewServer(mgr)

	log.Printf("Citizens' Bastion Backend Server listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, srv); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

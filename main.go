package main

import (
	"fmt"
	"log"
	"net/http"

	"real-time-forum/internal/chat"

	"real-time-forum/internal/config"
	"real-time-forum/internal/database"
	"real-time-forum/internal/handlers"
)

func main() {
	database.InitDB(config.Path)

	mux := http.NewServeMux()
	hub := chat.NewHub()
	go hub.Run()

	mux.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.Dir("./frontend"))))

	mux.HandleFunc("/", handlers.HomeHandler)
	mux.HandleFunc("/session", handlers.SessionHandler)
	mux.HandleFunc("/login", handlers.LoginHandler)
	mux.HandleFunc("/logout", handlers.LogoutHandler)
	mux.HandleFunc("/register", handlers.RegisterHandler)
	mux.HandleFunc("/user", handlers.UserHandler)
	mux.HandleFunc("/post", handlers.PostHandler)
	mux.HandleFunc("/message", handlers.MessageHandler)
	mux.HandleFunc("/comment", handlers.CommentHandler)
	mux.HandleFunc("/like", handlers.LikeHandler)
	mux.HandleFunc("/chat", handlers.ChatHandler)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		chat.ServeWs(hub, w, r)
	})

	fmt.Println("http://localhost:8000")
	if err := http.ListenAndServe(":8000", mux); err != nil {
		log.Fatal(err)
	}
}

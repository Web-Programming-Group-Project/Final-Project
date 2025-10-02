# Default target runs both frontend and backend
dev:
	$(MAKE) dev-frontend &
	$(MAKE) dev-backend &
	wait

# Run frontend (React/Vite, at project root)
dev-frontend:
	npm run dev

# Run backend (Express API, inside server/)
dev-backend:
	cd server && npm run dev

# Kill background processes if needed
stop:
	- kill -9 $$(lsof -t -i:5173 -sTCP:LISTEN) 2>/dev/null || true
	- kill -9 $$(lsof -t -i:8080 -sTCP:LISTEN) 2>/dev/null || true

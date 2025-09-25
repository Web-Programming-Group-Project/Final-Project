import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import App from "./App.jsx";


createRoot(document.getElementById("root")).render(
<React.StrictMode>
    <App />
</React.StrictMode>
);
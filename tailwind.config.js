import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#ee8c2b",
                "primary-hover": "#d97b1f",
                "background-light": "#f8f7f6",
                "background-dark": "#16181d",
                "card-light": "#ffffff",
                "card-dark": "#1e2126",
                "text-main": "#1b140d",
                "text-muted": "#a0a5ad",
                "border-dark": "#2a2e35",
            },
            fontFamily: {
                sans: ["Plus Jakarta Sans", "sans-serif"],
                display: ["Plus Jakarta Sans", "sans-serif"],
            },
            animation: {
                fadeIn: "fadeIn 0.5s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [
        forms,
        containerQueries,
    ],
}

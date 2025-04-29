import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xsm: "500px",
        sm: "600px",
        md: "690px",
        lg: "988px",
        xl: "1078px",
        xxl: "1265px",
      },
      colors: {
        textGray: "#71767b",
        textGrayLight: "#e7e9ea", 
        borderGray: "#ffe046", // acutally yellow
        inputGray: "#00000", // actually black
        iconBlue: "#ffe046",
        iconGreen: "#00ba7c",
        iconPink: "#f91880",
      },
    },
  },
  plugins: [],
} satisfies Config;

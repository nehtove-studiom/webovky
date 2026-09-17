import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kontakt" element={<Contact />} />
        <Route path="/obchodni-podminky" element={<Terms />} />
      </Routes>
      <Toaster />
    </>
  );
}

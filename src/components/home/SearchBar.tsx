import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xl mx-auto">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search laptops, printers, RAM, CCTV..."
        className="h-12 w-full rounded-xl border bg-card pl-12 pr-4 text-sm text-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 focus:shadow-glow placeholder:text-muted-foreground"
      />
    </form>
  );
};

export default SearchBar;

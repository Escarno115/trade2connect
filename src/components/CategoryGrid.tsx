import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const CategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {CATEGORIES.map(({ value, label, icon: Icon, color }, i) => (
        <button
          key={value}
          onClick={() => navigate(`/browse?category=${value}`)}
          className="flex flex-col items-center gap-2 active-scale"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", color)}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
};

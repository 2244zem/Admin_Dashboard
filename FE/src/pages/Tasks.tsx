import { NavLink, useLocation } from "react-router-dom";
import TasksRutin from "./TasksRutin";
import TasksTidakRutin from "./TasksTidakRutin";

export default function Tasks() {
  const { pathname } = useLocation();
  const isTidakRutin = pathname === "/tugas-insidental";

  return (
    <>
      <nav className="flex gap-2 border-b border-gray-200 bg-white px-8 pt-4 dark:bg-base dark:border-line" aria-label="Jenis tugas">
        <NavLink
          to="/tasks"
          end
          className={({ isActive }) => `px-4 py-2 text-sm font-semibold border-b-2 ${isActive ? "border-[#0F4C81] text-[#0F4C81]" : "border-transparent text-gray-400"}`}
        >
          Tugas Rutin
        </NavLink>
        <NavLink
          to="/tugas-insidental"
          className={({ isActive }) => `px-4 py-2 text-sm font-semibold border-b-2 ${isActive ? "border-[#0F4C81] text-[#0F4C81]" : "border-transparent text-gray-400"}`}
        >
          Tugas Tidak Rutin
        </NavLink>
      </nav>
      {isTidakRutin ? <TasksTidakRutin /> : <TasksRutin />}
    </>
  );
}

interface PageHeaderProps {
  title: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  return (
    <header className="flex items-center px-8 py-6 bg-white border-b border-gray-200 select-none">
      <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">{title}</h1>
    </header>
  );
};

export default PageHeader;

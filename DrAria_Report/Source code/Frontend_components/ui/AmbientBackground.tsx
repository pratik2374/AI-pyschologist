export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#E8EAE3] rounded-full mix-blend-multiply filter blur-[80px] animate-ambient"></div>
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#EBE7DF] rounded-full mix-blend-multiply filter blur-[100px] animate-ambient" 
        style={{ animationDelay: '-5s' }}
      ></div>
    </div>
  );
}

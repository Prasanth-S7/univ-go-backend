import Lottie from "lottie-react";
import HeartAnimation from './heart.json'

interface FooterProps {
    transparent?: boolean;
}

//remove footerrrr
const Footer = ({ transparent = false }: FooterProps) => {
    return (
        <div></div>
        // <div 
        //     className={`flex items-center justify-center h-12 md:h-14 w-full border-t border-white/10 px-2 md:px-4 py-2 ${
        //         transparent ? 'bg-transparent' : 'backdrop-blur-sm bg-black'
        //     }`}
        // >
        //     <div className="flex items-center gap-1.5 md:gap-3 text-white/90 text-sm md:text-lg">
        //         <span className="font-medium whitespace-nowrap">Made with</span>
        //         <Lottie animationData={HeartAnimation} loop={true} className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
        //         <span className="font-medium">by</span>
        //         <img 
        //             src="/images/devs.png" 
        //             alt="DEVS" 
        //             className="h-8 md:h-14 object-contain flex-shrink-0"
        //         />
        //         <span className="font-medium">&</span>
        //         <a href="https://www.exovance.in/" target="_blank" rel="noopener noreferrer">
        //             <img 
        //                 src="/images/exo_final.png" 
        //                 alt="Exovance" 
        //                 className="h-5 md:h-10 object-contain hover:opacity-80 transition-opacity flex-shrink-0"
        //             />
        //         </a>
        //     </div>
        // </div>
    )
}

export default Footer
import React from 'react';

const PlusIcon = ({ className = '', children, ...props }) => {
    return (
        <div className="inline-flex items-center">
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                // {/* O stroke="currentColor" permite que você mude a cor do ícone via classes de texto do Tailwind */}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                className={`h-5 w-5 ${className}`}
                {...props}
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v16m8-8H4" 
                />
            </svg>

            {/* Se houver texto dentro da tag, ele aparece aqui */}
            {children && <span className="ml-2">{children}</span>}
        </div>
    );
};

export default PlusIcon;
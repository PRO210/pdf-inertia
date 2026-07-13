import React from 'react';

const Upload = ({ className = '', children, ...props }) => {
    return (
        <div className="flex flex-col items-center justify-center pointer-events-none">
            <svg
                className="w-12 h-12 mb-3 text-gray-400 group-hover:text-indigo-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                // className={`h-5 w-5 ${className}`}
                {...props}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"

                />
            </svg>

            {/* Se houver texto dentro da tag, ele aparece aqui */}
            {children && <span className="ml-2">{children}</span>}
        </div>
    );
};

export default Upload;


import React from "react";
import Image from "next/image";
import Logo from "@/public/assets/tactil-logo.png";

const Navbar = () => {
  return (
    <div className="fixed p-4 sm:max-w-md w-4/5 m-4 rounded-full backdrop-blur-sm flex items-center justify-center border border-gray-300 shadow-lg z-50">
      <Image
        src={Logo}
        alt="Tactil Logo"
        width={100}
        height={100}
        className="fixed w-10 h-10 top-3 left-5 rounded-lg shadow-md sm:hidden block"
      />
      <h2 className="font-semibold text-3xl self-center">Tactil.</h2>
    </div>
  );
};

export default Navbar;

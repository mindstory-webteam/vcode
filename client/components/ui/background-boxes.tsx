"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const rows = new Array(150).fill(1);
  const cols = new Array(100).fill(1);

  // Using light violet color values to match the purple login panel theme
  const colors = [
    "rgba(216, 180, 254, 0.6)", // violet-300
    "rgba(196, 181, 253, 0.6)", // violet-200
    "rgba(167, 139, 250, 0.5)", // violet-400
    "rgba(233, 213, 255, 0.7)", // violet-100
    "rgba(192, 132, 252, 0.5)", // purple-400
    "rgba(240, 171, 252, 0.6)", // fuchsia-300
    "rgba(249, 168, 212, 0.5)", // pink-300
    "rgba(165, 180, 252, 0.6)", // indigo-300
    "rgba(255, 255, 255, 0.3)", // white
  ];

  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0",
        className
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <motion.div
          key={`row` + i}
          className="w-16 h-8 border-l border-violet-300/30 relative"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col` + j}
              className="w-16 h-8 border-r border-t border-violet-300/30 relative"
            >
            
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);

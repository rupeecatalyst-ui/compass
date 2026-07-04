"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";
import { buttonTap, buttonHover } from "@/lib/animations";

interface MotionButtonProps extends ButtonProps, Omit<HTMLMotionProps<"button">, keyof ButtonProps> {}

export function MotionButton({ children, ...props }: MotionButtonProps) {
  return (
    <motion.div whileHover={buttonHover} whileTap={buttonTap} className="inline-flex">
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}

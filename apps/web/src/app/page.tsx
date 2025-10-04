"use client";

import { motion } from "framer-motion";
import { Code2, BarChart3, Shield, Zap, Download, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const downloadUrl = (platform: string) =>
    `/api/download?platform=${platform}&version=latest`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Code2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CodePulse</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <a
              href="https://github.com/username/codepulse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition"
            >
              <Github className="h-6 w-6" />
            </a>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <motion.div className="max-w-4xl mx-auto text-center" {...fadeIn}>
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            Analyze Your Codebase
            <br />
            Like Never Before
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Beautiful, privacy-first code analysis for developers.
            <br />
            Fast, powerful, and completely offline.
          </motion.p>

          {/* Download Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <a href={downloadUrl("mac")}>
              <Button size="lg" className="w-full sm:w-auto gap-2">
                <Download className="h-5 w-5" />
                Download for macOS
              </Button>
            </a>
            <a href={downloadUrl("win")}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <Download className="h-5 w-5" />
                Download for Windows
              </Button>
            </a>
            <a href={downloadUrl("linux")}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <Download className="h-5 w-5" />
                Download for Linux
              </Button>
            </a>
          </motion.div>

          <motion.p
            className="mt-4 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Free and open source. No account required.
          </motion.p>
        </motion.div>

        {/* Hero Animation/Visual */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl border shadow-2xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Code2 className="h-32 w-32 text-primary/20" />
            </div>
            {/* Placeholder for Lottie/Spline animation */}
            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
              🎬 Animation placeholder
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-4">Why CodePulse?</h2>
          <p className="text-xl text-muted-foreground">
            Built for developers who care about speed, privacy, and insights.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerChildren}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {[
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Rust-powered backend scans thousands of files in seconds.",
            },
            {
              icon: Shield,
              title: "Privacy First",
              description: "All analysis happens locally. Your code never leaves your machine.",
            },
            {
              icon: BarChart3,
              title: "Rich Insights",
              description: "Detailed stats, charts, and breakdowns by language and project.",
            },
            {
              icon: Code2,
              title: "Developer Friendly",
              description: "Export to CSV/JSON, beautiful UI, dark mode, and more.",
            },
          ].map((feature, i) => (
            <motion.div key={i} variants={fadeIn}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-12 text-white"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold mb-4">Ready to dive in?</h2>
          <p className="text-xl mb-8 opacity-90">
            Download CodePulse now and start analyzing your code in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={downloadUrl("mac")}>
              <Button size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                <Download className="h-5 w-5 mr-2" />
                Get Started
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2024 CodePulse. MIT License. Privacy-first and open source.</p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </a>
            <a
              href="https://github.com/username/codepulse"
              className="hover:text-foreground transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

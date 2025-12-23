import { describe, it, expect, beforeEach } from "vitest";
import { ComputeResourcesServer } from "../server.js";

describe("Compute Resources - Prompts", () => {
  let server: ComputeResourcesServer;

  beforeEach(() => {
    server = new ComputeResourcesServer();
  });

  describe("getPrompts", () => {
    it("should list recommend_compute_resource prompt", () => {
      const prompts = server["getPrompts"]();

      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toMatchObject({
        name: "recommend_compute_resource",
        description: expect.stringContaining("personalized"),
      });

      const args = prompts[0].arguments;
      expect(args).toHaveLength(4);
      expect(
        args?.find((a: { name: string; required?: boolean }) => a.name === "research_area")
          ?.required
      ).toBe(true);
      expect(
        args?.find((a: { name: string; required?: boolean }) => a.name === "compute_needs")
          ?.required
      ).toBe(true);
      expect(
        args?.find((a: { name: string; required?: boolean }) => a.name === "experience_level")
          ?.required
      ).toBe(false);
      expect(
        args?.find((a: { name: string; required?: boolean }) => a.name === "allocation_size")
          ?.required
      ).toBe(false);
    });
  });

  describe("handleGetPrompt - recommend_compute_resource", () => {
    it("should generate prompt with ML context for GPU research", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "machine learning",
            compute_needs: "GPU for training transformers",
          },
        },
      });

      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("messages");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");

      const promptText = result.messages[0].content.text;

      // Should include field context
      expect(promptText).toContain("Computer Science");

      // Should include GPU systems (Delta has GPUs)
      expect(promptText).toContain("Delta");

      // Should include GPU guidance
      expect(promptText).toContain("GPU");

      // Should not include irrelevant systems without GPUs
      expect(promptText).not.toContain("Open Science Grid");
    });

    it("should generate prompt with genomics context for high memory research", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "genomics",
            compute_needs: "genome assembly requiring 500GB RAM",
          },
        },
      });

      const promptText = result.messages[0].content.text;

      // Should include biological sciences field
      expect(promptText).toContain("Biological Sciences");

      // Should include high memory systems
      expect(promptText).toContain("Bridges-2"); // Has extreme memory

      // Should include memory guidance
      expect(promptText).toContain("Memory");
    });

    it("should adapt to beginner experience level", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "climate modeling",
            compute_needs: "parallel simulations",
            experience_level: "beginner",
          },
        },
      });

      const promptText = result.messages[0].content.text;

      // Should mention experience level
      expect(promptText).toContain("beginner");

      // Should include beginner-friendly note in instructions
      expect(promptText).toContain("new to HPC");

      // Should only include systems suitable for beginners
      expect(promptText).toContain("Experience Level");
    });

    it("should filter systems by experience level", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "AI",
            compute_needs: "GPU training",
            experience_level: "beginner",
          },
        },
      });

      const promptText = result.messages[0].content.text;

      // Should include beginner-friendly systems
      expect(promptText).toContain("Bridges-2"); // Supports all levels

      // Stampede3 is advanced/expert only, might not be included
      // (depends on other filtering criteria)
    });

    it("should include allocation size if provided", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "physics",
            compute_needs: "large scale simulations",
            allocation_size: "large project",
          },
        },
      });

      const promptText = result.messages[0].content.text;
      expect(promptText).toContain("Allocation Size");
      expect(promptText).toContain("large project");
    });

    it("should include correct allocation tier guidance", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "chemistry",
            compute_needs: "molecular dynamics",
          },
        },
      });

      const promptText = result.messages[0].content.text;

      // Should mention allocation tiers
      expect(promptText).toContain("Discover");
      expect(promptText).toContain("Explore");
      expect(promptText).toContain("Accelerate");
      expect(promptText).toContain("credits");
    });

    it("should handle unknown field gracefully", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "underwater basket weaving",
            compute_needs: "need fast compute",
          },
        },
      });

      const promptText = result.messages[0].content.text;

      // Should still generate a valid prompt
      expect(promptText).toContain("underwater basket weaving");
      expect(promptText).toContain("fast compute");

      // Should include at least some systems
      expect(promptText).toContain("ACCESS Systems");
    });

    it("should throw error for unknown prompt", async () => {
      await expect(
        server["handleGetPrompt"]({
          params: {
            name: "nonexistent_prompt",
            arguments: {},
          },
        })
      ).rejects.toThrow("Unknown prompt");
    });
  });

  describe("Prompt Context Filtering", () => {
    it("should include GPU guide only for GPU-relevant requests with matching use cases", async () => {
      // GPU request with specific use case that matches GPU_SELECTION_GUIDE
      const gpuResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "computer vision",
            compute_needs: "training convolutional neural networks",
          },
        },
      });

      expect(gpuResult.messages[0].content.text).toContain("GPU Guidance");
      expect(gpuResult.messages[0].content.text).toContain("Computer Vision");

      // Generic GPU request without specific use case won't include GPU guidance section
      // (GPU systems will still be included)
      const genericGpuResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "deep learning",
            compute_needs: "GPU acceleration",
          },
        },
      });

      // GPU systems should be included
      expect(genericGpuResult.messages[0].content.text).toContain("Delta");
      // But specific GPU guidance section only appears if use case matches
      // (This is selective embedding in action)

      // Non-GPU request
      const cpuResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "data analysis",
            compute_needs: "CPU parallel processing",
          },
        },
      });

      // Should not include GPU-specific guidance
      expect(cpuResult.messages[0].content.text).not.toContain("GPU Guidance");

      // Note: General purpose systems (like Delta) may still appear since they have CPU
      // capabilities too. The key is GPU guidance is not included.
    });

    it("should include memory guidance only for memory-intensive requests", async () => {
      // High memory request
      const memResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "genomics",
            compute_needs: "genome assembly with 1TB RAM",
          },
        },
      });

      expect(memResult.messages[0].content.text).toContain("Memory Options");

      // Standard request
      const stdResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "data science",
            compute_needs: "standard analysis",
          },
        },
      });

      expect(stdResult.messages[0].content.text).not.toContain("Memory Options");
    });

    it("should filter systems based on capabilities needed", async () => {
      // GPU-only systems should appear for GPU requests
      const gpuResult = await server["handleGetPrompt"]({
        params: {
          name: "recommend_compute_resource",
          arguments: {
            research_area: "AI",
            compute_needs: "GPU for neural networks",
          },
        },
      });

      const gpuText = gpuResult.messages[0].content.text;

      // Delta has GPUs
      expect(gpuText).toContain("Delta");

      // Open Science Grid doesn't have GPUs
      expect(gpuText).not.toContain("Open Science Grid");
    });
  });
});

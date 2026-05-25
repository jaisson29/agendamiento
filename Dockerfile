FROM denoland/deno:2.3.3

# Set the working directory
WORKDIR /app

# Now copy the rest of the application
COPY . .

# Cache the application code
RUN deno cache main.ts

# build the application
RUN deno task build

# Set production environment
ENV DENO_ENV=production

# Expose the port
EXPOSE 8000

# Run the application with necessary permissions
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]

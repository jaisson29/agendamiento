FROM denoland/deno:2.3.3

# Set the working directory
WORKDIR /app

# Now copy the rest of the application
COPY . .

# construct the app
RUN deno install && deno cache main.ts && deno task build

# Set production environment
ENV DENO_ENV=production

# Expose the port
EXPOSE 8000

# Run the application with necessary permissions
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]

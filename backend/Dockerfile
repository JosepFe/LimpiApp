# LimpiApp API: build with the .NET 10 SDK, run on the ASP.NET Core runtime as the non-root `app` user (E01/US-005).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props .editorconfig ./
COPY src/LimpiApp.Api/LimpiApp.Api.csproj src/LimpiApp.Api/
RUN dotnet restore src/LimpiApp.Api/LimpiApp.Api.csproj
COPY src src
RUN dotnet publish src/LimpiApp.Api -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
# Photos volume (PHOTOS_DIR): created here so the named volume inherits the owner on first mount.
RUN mkdir -p /data/photos && chown app:app /data/photos
WORKDIR /app
COPY --from=build /out .
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "LimpiApp.Api.dll"]

using System.Security.Cryptography;

namespace LimpiApp.Api.Common;

/// <summary>Random URL-safe tokens; only their SHA-256 is stored.</summary>
public static class Tokens
{
    public static string New() => Base64Url(RandomNumberGenerator.GetBytes(32));

    public static byte[] Hash(string token) => SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

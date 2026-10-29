using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LimpiApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PhotoPositionUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_completion_photos_completion_id",
                table: "completion_photos");

            migrationBuilder.CreateIndex(
                name: "ix_completion_photos_completion_id_position",
                table: "completion_photos",
                columns: new[] { "completion_id", "position" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_completion_photos_position",
                table: "completion_photos",
                sql: "position >= 0 AND position < 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_completion_photos_completion_id_position",
                table: "completion_photos");

            migrationBuilder.DropCheckConstraint(
                name: "ck_completion_photos_position",
                table: "completion_photos");

            migrationBuilder.CreateIndex(
                name: "ix_completion_photos_completion_id",
                table: "completion_photos",
                column: "completion_id");
        }
    }
}

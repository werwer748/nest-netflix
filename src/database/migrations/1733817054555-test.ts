import { MigrationInterface, QueryRunner } from "typeorm";

export class Test1733817054555 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "test" (id SERIAL)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "test"`)
    }

}

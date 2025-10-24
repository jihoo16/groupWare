package com.pinecni.erp.util;

import java.sql.*;

/**
 * DB 테이블 스키마를 읽어오는 유틸리티 클래스
 * 실행 후 콘솔 출력 결과를 복사해서 Entity 생성에 사용
 */
public class TableSchemaReader {

    private static final String URL = "jdbc:postgresql://192.168.1.165:15431/pinecni";
    private static final String USER = "erp_dev";
    private static final String PASSWORD = "rdsdap1234!%";
    private static final String SCHEMA = "public";

    public static void main(String[] args) {
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD)) {
            System.out.println("✅ DB 연결 성공\n");

            DatabaseMetaData metaData = conn.getMetaData();

            // 1. 모든 테이블 목록 조회
            System.out.println("========================================");
            System.out.println("테이블 목록");
            System.out.println("========================================");

            ResultSet tables = metaData.getTables(null, SCHEMA, "%", new String[]{"TABLE"});
            while (tables.next()) {
                String tableName = tables.getString("TABLE_NAME");
                String tableType = tables.getString("TABLE_TYPE");
                String remarks = tables.getString("REMARKS");

                System.out.println("📋 " + tableName);
                if (remarks != null && !remarks.isEmpty()) {
                    System.out.println("   설명: " + remarks);
                }
            }
            tables.close();

            System.out.println();

            // 2. 각 테이블의 컬럼 정보 상세 조회
            tables = metaData.getTables(null, SCHEMA, "%", new String[]{"TABLE"});
            while (tables.next()) {
                String tableName = tables.getString("TABLE_NAME");

                System.out.println("\n========================================");
                System.out.println("테이블: " + tableName);
                System.out.println("========================================");

                // 컬럼 정보
                ResultSet columns = metaData.getColumns(null, SCHEMA, tableName, "%");
                while (columns.next()) {
                    String columnName = columns.getString("COLUMN_NAME");
                    String dataType = columns.getString("TYPE_NAME");
                    int columnSize = columns.getInt("COLUMN_SIZE");
                    String isNullable = columns.getString("IS_NULLABLE");
                    String columnDef = columns.getString("COLUMN_DEF");
                    String remarks = columns.getString("REMARKS");

                    System.out.printf("  %-30s %-20s (%d) %s",
                            columnName,
                            dataType,
                            columnSize,
                            "NO".equals(isNullable) ? "NOT NULL" : "");

                    if (columnDef != null && !columnDef.isEmpty()) {
                        System.out.print(" DEFAULT " + columnDef);
                    }

                    if (remarks != null && !remarks.isEmpty()) {
                        System.out.print(" -- " + remarks);
                    }

                    System.out.println();
                }
                columns.close();

                // Primary Key
                System.out.println("\n  [Primary Keys]");
                ResultSet primaryKeys = metaData.getPrimaryKeys(null, SCHEMA, tableName);
                while (primaryKeys.next()) {
                    String pkColumnName = primaryKeys.getString("COLUMN_NAME");
                    String pkName = primaryKeys.getString("PK_NAME");
                    System.out.println("    • " + pkColumnName + " (PK: " + pkName + ")");
                }
                primaryKeys.close();

                // Foreign Keys
                System.out.println("\n  [Foreign Keys]");
                ResultSet foreignKeys = metaData.getImportedKeys(null, SCHEMA, tableName);
                while (foreignKeys.next()) {
                    String fkColumnName = foreignKeys.getString("FKCOLUMN_NAME");
                    String pkTableName = foreignKeys.getString("PKTABLE_NAME");
                    String pkColumnName = foreignKeys.getString("PKCOLUMN_NAME");
                    String fkName = foreignKeys.getString("FK_NAME");

                    System.out.println("    • " + fkColumnName + " → " + pkTableName + "." + pkColumnName + " (FK: " + fkName + ")");
                }
                foreignKeys.close();

                // Indexes
                System.out.println("\n  [Indexes]");
                ResultSet indexes = metaData.getIndexInfo(null, SCHEMA, tableName, false, false);
                while (indexes.next()) {
                    String indexName = indexes.getString("INDEX_NAME");
                    String columnName = indexes.getString("COLUMN_NAME");
                    boolean nonUnique = indexes.getBoolean("NON_UNIQUE");

                    if (indexName != null && columnName != null) {
                        System.out.println("    • " + indexName + " (" + columnName + ")" + (nonUnique ? "" : " [UNIQUE]"));
                    }
                }
                indexes.close();
            }
            tables.close();

            System.out.println("\n========================================");
            System.out.println("✅ 스키마 조회 완료");
            System.out.println("========================================");

        } catch (SQLException e) {
            System.err.println("❌ DB 연결 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

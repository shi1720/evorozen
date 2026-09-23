import unittest
from backup import database_environment


class DatabaseEnvironmentTests(unittest.TestCase):
    def test_tls_cannot_be_weakened_by_connection_url_and_pooler_is_removed(self):
        env = database_environment("postgresql://user:p%40ss@ep-example-pooler.eu-central-1.aws.neon.tech/db?sslmode=disable&sslrootcert=unsafe")
        self.assertEqual(env["PGHOST"], "ep-example.eu-central-1.aws.neon.tech")
        self.assertEqual(env["PGPASSWORD"], "p@ss")
        self.assertEqual(env["PGSSLMODE"], "verify-full")
        self.assertEqual(env["PGSSLROOTCERT"], "system")
        self.assertNotIn("DATABASE_URL", env)

    def test_rejects_unexpected_host_and_missing_credentials(self):
        for url in ["postgresql://user:pass@attacker.example/db", "postgresql://user@ep-example.neon.tech/db", "https://user:pass@ep-example.neon.tech/db"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                database_environment(url)


if __name__ == "__main__":
    unittest.main()

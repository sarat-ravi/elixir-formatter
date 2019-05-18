# Overview
Format your elixir code automatically using `mix format`

## Configuration
By default, this extension runs `mix format` using the workspace root directory as the working directory. The following
options are available for the user to configure, in `settings.json`:

```javascript
{
  elixir.formatter: {
    mixFormatArgs: "--dry-run",
    formatterCwd: "../some/dir/to/run/mix/format/from"
  }
}
```

## Requirements
* Install Elixir 1.6

## License
MIT

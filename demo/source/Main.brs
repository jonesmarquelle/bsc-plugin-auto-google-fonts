sub main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("FontDemoScene")
    screen.show()
    ' vscode_rdb_on_device_component_entry

  
    while(true)
      msg = wait(0, m.port)
      msgType = type(msg)
  
      ' Handle screen closed event
      if msgType = "roSGScreenEvent"
        if msg.isScreenClosed() then return
      end if
  
      ' Handle exitChannel field event
      if msgType = "roSGNodeEvent"
        field = msg.getField()
        if field = "exitChannel" then return
      end if
    end while
end sub